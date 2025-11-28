const jwt = require("jsonwebtoken");
const User = require("../models/user");

module.exports = async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({ ok: false, msg: "No autorizado" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ ok: false, msg: "Token inválido" });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Error en authMiddleware:", error);
        res.status(401).json({ ok: false, msg: "Token inválido" });
    }
};
