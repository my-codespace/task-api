const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // FIX 3: The original returned 403 (Forbidden) for a missing token.
    // 401 (Unauthorized) is the correct HTTP status when no credentials are
    // provided at all. 403 means "I know who you are, but you can't do this."
    // The frontend checks for both 401 and 403 to trigger logout — which is
    // fine — but using the right codes makes debugging much easier.
    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // FIX 4: The original did authHeader.split(' ')[1] with no guard.
    // If someone sends "Authorization: mytoken" (no "Bearer " prefix) this
    // gives undefined, and jwt.verify(undefined, ...) throws a confusing error.
    // We now validate the format before extracting.
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Token format must be: Bearer <token>' });
    }

    const token = parts[1];

    try {
        const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedPayload;
        next();
    } catch (error) {
        // Distinguish between an expired token and a completely invalid one.
        // Both get a 401, but the message helps you debug in the Render logs.
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired. Please log in again.' });
        }
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = verifyToken;