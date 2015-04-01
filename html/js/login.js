/*
 * Copyright 2012-2013 AGR Audio, Industria e Comercio LTDA. <contato@portalmod.com>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * The authentication has the following steps:
 * 
 * 1 - Get a session id (sid) from cloud
 * 
 * 2 - Send the sid to device, get the device serial number and signed sid
 * 
 * 3 - Send the signed sid to cloud. If device is already assigned to a user,
 *     user data is received and login is done.
 * 
 * 4 - Application calls method login() when authorization is needed. If user
 *     is not logged, an authentication window will open
 * 
 * 5 - Login and password is sent to server. The response will be a package containing
 *     user data signed by server
 *
 * 6 - The package is sent to device, that will confirm server signature
 *
 * Now the session id can be used to identify this user + device pair.
 */

function UserSession(options) {
    var self = this

    var OFFLINE = 0 // Cloud haven't been reached yet, maybe no network
    var CONNECTING = 1 // Trying to reach cloud and get a session id
    var ONLINE = 2 // Device has been identified
    var LOGGED = 3 // User has been identified and is logged at this device
    var DISCONNECTED = 4 // Device was not recognized by Cloud, communication suspended

    var SITEURLNEW = "http://social.dev.portalmod.com"

    this.status = OFFLINE
    this.minRetryTimeout = 5
    this.maxRetryTimeout = 320

    this.retryTimeout = this.minRetryTimeout

    options = $.extend({
        offline: function () {},
        connecting: function () {},
        online: function () {},
        login: function () {},
        logout: function () {},
        disconnected: function () {},
        notify: function (message) {
            new Notification('error', message)
        },
        loginWindow: $('<div>')
    }, options)

    this.tryConnectingToSocial = function () {
        self.setStatus(OFFLINE)
        /*
         TODO
        self.setStatus(CONNECTING)
        $.ajax({
            url: SITEURLNEW + '/api/auth/session',
            type: 'GET',
            success: function (sid) {
                self.sid = sid
                self.retryTimeout = self.minRetryTimeout
                self.signSession()
            },
            error: function (e) {
                self.setStatus(OFFLINE)
                if (self.retryTimeout == self.minRetryTimeout)
                    self.notify("Could not contact cloud")
                self.retry()
            },
            dataType: 'json'
        })
        */
    }

    /*
    this.retry = function () {
        timeout = self.retryTimeout
        self.retryTimeout = Math.max(self.maxRetryTimeout, timeout * 2)
        setTimeout(function () {
            self.getSessionId()
        }, timeout)
    }

    this.signSession = function () {
        $.ajax({
            url: '/login/sign_session/' + self.sid,
            success: function (signature) {
                self.identifyDevice(signature)
            },
            error: function (e) {
                console.log(e)
                self.notify('Could not start authentication')
            },
            dataType: 'json'
        })
    }

    this.identifyDevice = function (signature) {
        $.ajax({
            url: SITEURLNEW + '/login/identify_device',
            data: signature,
            type: 'GET',
            success: function (status) {
                if (!status.device_auth) {
                    self.setStatus(OFFLINE)
                    return self.notify('This device cannot be identified, please contact support')
                }
                if (status.user_auth)
                    self.identifyUser(status.user, status.signature, new Function())
                else {
                    self.setStatus(ONLINE)
                    self.notify()
                }
            },
            error: function () {
                self.setStatus(OFFLINE)
            },
            dataType: 'json'
        });
    }*/

    this.login = function (callback) {
        if (self.status === LOGGED) {
            return callback()
        }
        options.loginWindow.window('open')
        self.loginCallback = callback
    };

    options.loginWindow.find('form').on('submit', function (event) {
        event.preventDefault();
        options.loginWindow.find('.error').hide()
        $(this).find('input[type=password]').val('')
        $.ajax({
            url: SITEURLNEW + '/api/auth/session',
            method: 'POST',
            data: $(this).serialize(),
            headers : { 'Content' : window.location.host },
            success: function (resp) {
                if (!resp.ok) {
                    options.loginWindow.find('.error').text('Invalid username or password').show()
                    return
                }
                alert(resp)
                /*
                self.identifyUser(resp.user, resp.signature, function (ok) {
                    if (ok) {
                        if (self.loginCallback) {
                            self.loginCallback()
                            self.loginCallback = null
                        }
                    } else {
                        self.notify('Security error: server sent invalid data')
                    }
                })
                */
            },
            error: function (resp) {
                return self.notify("Error authenticating")
            },
            dataType: 'json'
        })
    });

    options.loginWindow.find('.js-close').on('click', function () {
        options.loginWindow.find('.error').hide()
        options.loginWindow.find('input[type=text]').val('')
        options.loginWindow.find('input[type=password]').val('')
        options.loginWindow.window('close')
    })

    options.loginWindow.find('#register').click(function () {
        options.loginWindow.hide()
        options.registration.start(function (resp) {
            alert(resp)
            /*
            self.identifyUser(resp.user, resp.signature, function (ok) {
                if (ok) {
                    if (self.loginCallback) {
                        self.loginCallback()
                        self.loginCallback = null
                    }
                } else {
                    self.notify('Security error: server sent invalid data')
                }
            })
            */
        })
    })

    /*
    this.identifyUser = function (user_id, password, callback) {
        $.ajax({
            url: '/login/authenticate',
            method: 'POST',
            data: {
                user_id: user,
                password: password
            },
            success: function (resp) {
                if (resp.ok) {
                    self.user = self.treatUserData(resp.user)
                    options.loginWindow.window('close')
                    callback(true)
                    self.setStatus(LOGGED)
                } else {
                    callback(false)
                }
            },
            error: function (resp) {
                self.notify("Could not verify authentication data received from server")
            },
            dataType: 'json'
        })
    }
    */

    /*
    this.logout = function () {
        $.ajax({
            'url': SITEURLNEW + '/logout/' + self.sid,
            success: function () {
                self.sid = null
                options.logout()
                //self.getSessionId()
            },
            error: function () {
                return self.notify('Could not logout')
            }
        })
    }
    */

    this.setStatus = function (status) {
        if (status == self.status)
            return
        self.status = status
        switch (status) {
        case OFFLINE:
            options.offline();
            break;
        case CONNECTING:
            options.connecting();
            break;
        case ONLINE:
            options.online();
            break;
        case LOGGED:
            options.login();
            break;
        case DISCONNECTED:
            options.disconnected();
            break;
        }
    }

    this.treatUserData = function (user) {
        // This method is here as a hook to treat user data. It might be unnecessary legacy
        return user
    }

    this.notify = options.notify
}