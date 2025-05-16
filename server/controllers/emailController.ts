import { Request, Response } from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface User {
    accessToken: string;
    refreshToken: string;
    email?: string;
}

export const getSubscriptions = async (req: Request, res: Response) => {
    try {
        const user = req.user as User;

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Search for subscription emails
        const { data } = await gmail.users.messages.list({
            userId: 'me',
            q: 'unsubscribe in:inbox OR list-unsubscribe in:inbox',
            maxResults: 500
        });

        const messages = data.messages || [];
        const subscriptions: any[] = [];

        // Process each message to extract sender and unsubscribe info
        for (const message of messages) {
            const { data: msgData } = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!
            });

            const headers = msgData.payload?.headers || [];
            const fromHeader = headers.find(h => h.name === 'From');
            const listUnsubscribeHeader = headers.find(h => h.name === 'List-Unsubscribe');

            if (fromHeader && listUnsubscribeHeader) {
                subscriptions.push({
                    id: message.id,
                    from: fromHeader.value,
                    unsubscribeMethods: parseUnsubscribeHeader(listUnsubscribeHeader.value)
                });
            }
        }

        res.json({ subscriptions });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
};

export const unsubscribe = async (req: Request, res: Response) => {
    try {
        const { messageIds } = req.body;
        const user = req.user as User;

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const results = [];

        for (const messageId of messageIds) {
            try {
                // Get the message to find unsubscribe links
                const { data: msgData } = await gmail.users.messages.get({
                    userId: 'me',
                    id: messageId
                });

                const headers = msgData.payload?.headers || [];
                const listUnsubscribeHeader = headers.find(h => h.name === 'List-Unsubscribe');

                if (listUnsubscribeHeader) {
                    const methods = parseUnsubscribeHeader(listUnsubscribeHeader.value);

                    // Try HTTP unsubscribe first
                    if (methods.http && methods.http.length > 0) {
                        for (const url of methods.http) {
                            try {
                                await fetch(url, { method: 'POST' });
                                results.push({ messageId, status: 'success', method: 'http' });
                                break;
                            } catch (error) {
                                console.error(`HTTP unsubscribe failed for ${url}:`, error);
                            }
                        }
                    }

                    // Fall back to email unsubscribe
                    if (methods.mailto && results.find(r => r.messageId === messageId)?.status !== 'success') {
                        const mailto = methods.mailto[0];
                        const subject = 'Unsubscribe';

                        await gmail.users.messages.send({
                            userId: 'me',
                            requestBody: {
                                raw: createRawEmail(mailto, subject, 'Please unsubscribe me')
                            }
                        });

                        results.push({ messageId, status: 'success', method: 'mailto' });
                    }
                }
            } catch (error) {
                console.error(`Failed to unsubscribe from message ${messageId}:`, error);
                results.push({ messageId, status: 'failed', error: error.message });
            }
        }

        res.json({ results });
    } catch (error) {
        console.error('Error processing unsubscribe:', error);
        res.status(500).json({ error: 'Failed to process unsubscribe requests' });
    }
};

// Helper functions
function parseUnsubscribeHeader(header: string): { http: string[]; mailto: string[] } {
    const result = { http: [], mailto: [] } as { http: string[]; mailto: string[] };

    // Handle multiple formats
    if (header.startsWith('<') && header.endsWith('>')) {
        // Simple URL case
        const urls = header.split(',').map(s => s.trim().slice(1, -1));
        result.http = urls.filter(url => url.startsWith('http'));
        result.mailto = urls.filter(url => url.startsWith('mailto'));
    } else {
        // Complex case with angle brackets
        const regex = /<([^>]*)>/g;
        let match;
        while ((match = regex.exec(header)) !== null) {
            const url = match[1];
            if (url.startsWith('http')) {
                result.http.push(url);
            } else if (url.startsWith('mailto')) {
                result.mailto.push(url);
            }
        }
    }

    return result;
}

function createRawEmail(to: string, subject: string, body: string): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
        `To: ${to}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        body
    ];

    const message = messageParts.join('\n');
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}