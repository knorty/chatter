const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const secret = 'mysecretsshhh';

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const profile = await req.app.get('db').profile.findOne({ email })
        if (profile) {
            const validPass = await bcrypt.compare(password, profile.password)
            if (validPass) {
                const payload = { profile_id: profile.user_id };
                const token = jwt.sign(payload, secret, {
                    expiresIn: '1h'
                });
                res.send(token);
            }
        }
    } catch (e) {
        console.log(e)
        res.status(500).send('Something went wrong!')
    }
};

const checkToken = (req, res) => {
    res.sendStatus(200);
};

module.exports = {
    login,
    checkToken
};