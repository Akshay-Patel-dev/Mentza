    const otpService = require('../services/otp-service');
    const hashService = require('../services/hash-service');
    const userService = require('../services/user-service');
    const tokenService = require('../services/token-service');
    const UserDto = require('../dtos/user-dto');

    class AuthController {
        async sendOtp(req, res) {
            const { phone, email } = req.body;
            if (!phone && !email) {
                return res.status(400).json({ message: 'Phone or Email field is required!' });
            }

            const otp = await otpService.generateOtp();
            // const otp = 7777;
            
            const ttl = 1000 * 60 * 2; // 2 min
            const expires = Date.now() + ttl;
            const data = phone ? `${phone}.${otp}.${expires}` : `${email}.${otp}.${expires}`;
            const hash = hashService.hashOtp(data);
            console.log("this is data" ,data)

            // send OTP
            try {
                if(phone){
                    let Phone = "+91"+ phone;
                    await otpService.sendBySms(Phone, otp);
                    res.json({
                    hash: `${hash}.${expires}`,
                    phone,
                    });
                }
                else if (email) {
                    await otpService.sendByEmail(email, otp);
                    res.json({
                        hash: `${hash}.${expires}`,
                        email,
                    });
                } 
            } catch (err) {
                console.log(err);
                res.status(500).json({ message: 'message sending failed' });
            }
        }

    async verifyOtp(req, res) {
        const { otp, hash, phone, email } = req.body;
            console.log(otp,hash,phone,email);
        // Check if otp, hash, and at least one of phone or email are provided
        if (!otp || !hash || (phone === undefined && email === undefined)) {
            return res.status(400).json({ message: 'All fields are required!' });
        }

        // Validate OTP expiration
        const [hashedOtp, expires] = hash.split('.');
        // if (Date.now() > +expires) {
        //     return res.status(400).json({ message: 'OTP expired!' });
        // }

        // Prepare data for OTP verification based on provided field
        let data;
        if (phone !== undefined) {
            data = `${phone}.${otp}.${expires}`;
        } else if (email !== undefined) {
            data = `${email}.${otp}.${expires}`;
        } else {
            return res.status(400).json({ message: 'Either phone or email must be provided!' });
        }

        // Verify OTP
        const isValid = otpService.verifyOtp(hashedOtp, data);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        let user;
        try {
            // Find or create user based on phone or email
            if (phone !== undefined) {
                user = await userService.findUser({ phone });
                if (!user) {
                    user = await userService.createUser({ phone });
                }
            } else if (email !== undefined) {
                user = await userService.findUser({ email });
                if (!user) {
                    user = await userService.createUser({ email });
                }
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Db error' });
        }

        // Generate access and refresh tokens
        const { accessToken, refreshToken } = tokenService.generateTokens({
            _id: user._id,
            activated: false,
        });

        // Store refresh token in database
        await tokenService.storeRefreshToken(refreshToken, user._id);

        // Set cookies for access and refresh tokens
        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
            httpOnly: true,
            sameSite: 'lax'
        });

        res.cookie('accessToken', accessToken, {
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
            httpOnly: true,
            sameSite: 'lax'
        });

        // Prepare response with user data
        const userDto = new UserDto(user);
        res.json({ user: userDto, auth: true });
        }


        async refresh(req, res) {
            // get refresh token from cookie
            const { refreshToken: refreshTokenFromCookie } = req.cookies;
            // check if token is valid
            let userData;
            try {
                userData = await tokenService.verifyRefreshToken(
                    refreshTokenFromCookie
                );
            } catch (err) {
                return res.status(401).json({ message: 'Invalid Token' });
            }
            // Check if token is in db
            try {
                const token = await tokenService.findRefreshToken(
                    userData._id,
                    refreshTokenFromCookie
                );
                if (!token) {
                    return res.status(401).json({ message: 'Invalid token' });
                }
            } catch (err) {
                return res.status(500).json({ message: 'Internal error' });
            }
            // check if valid user
            const user = await userService.findUser({ _id: userData._id });
            if (!user) {
                return res.status(404).json({ message: 'No user' });
            }
            // Generate new tokens
            const { refreshToken, accessToken } = tokenService.generateTokens({
                _id: userData._id,
            });

            // Update refresh token
            try {
                await tokenService.updateRefreshToken(userData._id, refreshToken);
            } catch (err) {
                return res.status(500).json({ message: 'Internal error' });
            }
            // put in cookie
            res.cookie('refreshToken', refreshToken, {
                maxAge: 1000 * 60 * 60 * 24 * 30,
                httpOnly: true,
            });

            res.cookie('accessToken', accessToken, {
                maxAge: 1000 * 60 * 60 * 24 * 30,
                httpOnly: true,
            });
            // response
            const userDto = new UserDto(user);
            res.json({ user: userDto, auth: true });
        }

        async logout(req, res) {
            const { refreshToken } = req.cookies;
            // delete refresh token from db
            await tokenService.removeToken(refreshToken);
            // delete cookies
            res.clearCookie('refreshToken');
            res.clearCookie('accessToken');
            res.json({ user: null, auth: false });
        }
    }

    module.exports = new AuthController();
