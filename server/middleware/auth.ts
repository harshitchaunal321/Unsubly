import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '../config/config';

passport.use(
    new GoogleStrategy(
        {
            clientID: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
            callbackURL: '/api/auth/google/callback',
            scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
            accessType: 'offline',
            prompt: 'consent'
        },
        (accessToken, refreshToken, profile, done) => {
            // Here you would typically save the user to your database
            // For this example, we'll just pass the profile along with tokens
            const user = {
                id: profile.id,
                email: profile.emails?.[0]?.value,
                name: profile.displayName,
                accessToken,
                refreshToken
            };
            return done(null, user);
        }
    )
);

passport.serializeUser((user: any, done) => {
    done(null, user);
});

passport.deserializeUser((user: any, done) => {
    done(null, user);
});

export default passport;