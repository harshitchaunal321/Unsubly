import { Router } from 'express';
import passport from 'passport';
import config from '../config/config';

const router = Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
    accessType: 'offline',
    prompt: 'consent'
}));

router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${config.FRONTEND_URL}/?error=auth_failed`,
        session: true
    }),
    (req, res) => {
        // Successful authentication
        res.redirect(`${config.FRONTEND_URL}/dashboard`);
    }
);

// User session check
router.get('/user', (req, res) => {
    if (req.user) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect(config.FRONTEND_URL);
    });
});

export default router;