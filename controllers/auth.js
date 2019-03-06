const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
// const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
}))

// sgMail.setApiKey('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');

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
            email: '',
            password: ''
        },
        validationErrors: []
    })
}

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email,
                password
            },
            validationErrors: errors.array()
        })
    }

    User.findOne({
        where: {
            email
        }
    }).then(user => {
        if (!user) {
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email,
                    password
                },
                validationErrors: []
            })
        }
        bcrypt.compare(password, user.password).then(doMatch => {
            if (doMatch) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                console.log('req session', req.session)
                return req.session.save(err => {
                    return res.redirect('/');
                })
            }
            return res.status(422).render('auth/login', {
                path: '/login',
                pageTitle: 'Login',
                errorMessage: 'Invalid email or password.',
                oldInput: {
                    email,
                    password
                },
                validationErrors: []
            })
        }).catch(err => {
            res.redirect('/login');
        });

    }).catch(err => console.log(err));
}

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
         res.render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: message,
            oldInput: {
                name: '',
                email: '',
                password: '',
                confirmPassword: ''
            },
            validationErrors: []
        });
    }

exports.postSignup = (req, res, next) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('post sign up error ======', errors.array()[0].msg)
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {name, email, password, confirmPassword},
            validationErrors: errors.array()
        });
    }
    // User.findOne({
    //     where: {
    //         email
    //     }
    // }).then(userDoc => {
    //     if (userDoc) {
    //         req.flash('error', 'E-Mail exists already, please pick a different one.');
    //         return res.redirect('/signup');
    //     }
     bcrypt.hash(password, 12).then(hashPassword => {
            User.create({
                name,
                email,
                password: hashPassword
            })
        }).then(result => {
            res.redirect('/login');
            return transporter.sendMail({
                to: email,
                from: '13106321535@sina.com',
                subject: 'Signup succeeded!',
                html: '<h1>You successfully signed up!</h1>'
        }).catch(err => console.log(err));
    }).catch(err => console.log(err))
}

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    })
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (error, buffer) => {
        if (error) {
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({
                where: {
                    email: req.body.email
                }
            }).then(user => {
                if (!user) {
                    req.flash('error', 'No account with that email found.');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                return transporter.sendMail({
                    to: req.body.email,
                    from: '13106321535@sina.com',
                    subject: 'Password reset!',
                    html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
                `
                });
            }).catch(err => console.log(err));
    })
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        where: {
            resetToken: token,
            resetTokenExpiration: {
                $gt: Date.now()
            }
        }
    }).then(user => {
        let message = req.flash('error');
        if (message.length > 0) {
            message = message[0];
        } else {
            message = null;
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: message,
            userId: user.id,
            passwordToken: token
        })
    }).catch(error => console.log(error));
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    User.findOne({
        where: {
            resetToken: passwordToken,
            resetTokenExpiration: {
                $gt: Date.now()
            },
            id: userId
        }
    }).then(user => {
        resetUser = user;
        return bcrypt.hash(newPassword, 12)
    }).then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = null;
        resetUser.resetTokenExpiration = null;
        resetUser.save();

    }).then(result => {
        res.redirect('/login');
    }).catch(err => console.log (err));
}