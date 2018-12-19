const express = require('express');
const {postgraphile} = require('postgraphile');
const ConnectionFilterPlugin = require('postgraphile-plugin-connection-filter');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Initialize express
const app = express();

// Place this somewhere on the config
const isDev = Boolean(process.env.DEV);
const DEFAULT_ROLE = 'app_guest';
const JWT_SECRET = process.env.SERVER_SECRET || 'secret';

// Parser for POST body
app.use(bodyParser.json());


// Add postgraphile
app.use(postgraphile(process.env.DATABASE_URL, 'app_public', {
    appendPlugins: [
        ConnectionFilterPlugin
    ],
    graphileBuildOptions: {
        connectionFilterRelations: true, // default: false
    },
    // Set this explicitly
    graphqlRoute: '/graphql',

    // This is important to use ACL
    ignoreRBAC: false,

    //jwtSecret: JWT_SECRET,
    //jwtPgTypeIdentifier: 'app_public.jwt_token',

    pgSettings: async (req, res) => {
        let role = DEFAULT_ROLE;

        // If there is not header then default to guest
        if (req.headers.authorization) {
            let token = req.headers.authorization.split('Bearer');
            if (token.length > 1) {
                try {
                    let user = new Promise((resolve, reject) => {
                        jwt.verify(token[1].trim(), JWT_SECRET, (err, decoded) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve(decoded);
                        });
                    });
                    return {
                        role: user.role,
                        'jwt.claims.user_id': user.user_id
                    };
                } catch (e) {
                    // Throw error here
                }
            }
        }

        // Handle here the auth for the user
        return {
            role,
            'jwt.claims.user_id': 0
        };
    },

    // This is for development options only
    watchPg: isDev,
    graphiql: isDev,
    showErrorStack: isDev,
    enhanceGraphiql : isDev
}));

app.listen(4000, ()=> {
    console.log('server listening', isDev);
});