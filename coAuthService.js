angular.module('coAuth')

.constant('coAuthConfig', {
    loadingState: 'tab.starting',
    rootState: 'tab',
    goToStateAfterLogin: 'tab.dash',
    loginState: 'tab.friends',
    registerState: 'tab.account',
    apiHost: ''
})

.factory('coAuthService', function($q, $state, $stateParams, $rootScope, User, LoopBackAuth, $log, coAuthConfig, $http) {
    var service = {
        getAuthPromise: getAuthPromise,
        interceptRoutes: interceptRoutes,
        fetchAuthorizations: fetchAuthorizations,
        getMe: getMe,
        authorize: authorize,
        logout: logout,
        login: login,
        requestResetPassword: requestResetPassword
    };

    // initialize as public
    var authorizations;
    function initializeAuthorizations() {
        authorizations = {
            roles: ['$everyone', '$unauthenticated']
        }
    }
    initializeAuthorizations();

    function getMe() {
        return LoopBackAuth;
    }

    function login(email, password) {
        var loginPromise = User.login({email: email, password: password}).$promise

        loginPromise.then(function(res) {
            fetchAuthorizations().then(function() {
                $state.go(coAuthConfig.goToStateAfterLogin);
            });
        });

        return loginPromise;
    }

    function logout() {
        var logoutPromise = User.logout().$promise;

        logoutPromise.then(function() {
            initializeAuthorizations();
        });

        return logoutPromise;
    }

    function requestResetPassword(email) {
        return $http.post(coAuthConfig.apiHost + '/request-password-reset', { email: email }).then(function(res) {
            console.log(res);
        }, function(err) {
            console.log(err);
        });
    }

    var toDuringLoad;
    var authorizationsLoaded = false;
    var authDataResolve;
    var authDataPromise = $q(function(resolve) {
		authDataResolve = resolve;
	});

    function getAuthPromise() {
        return authDataPromise;
    }

    // Initializing data before loading application
    // ==================
    function fetchAuthorizations(loginState) {
        return $q(function(resolve) {
            User.myAuthorizations({ muteNotification: true }).$promise.then(function(myAuthorizations) {
                authorizations = myAuthorizations.authorizations;
                authDataResolve();
                authorizationsLoaded = true;
                resolve();
            }, function() {
                LoopBackAuth.clearUser();
                $log.debug('authorization data fetch failed, force login');
                $state.go(loginState);
            });
        });
    }

    // { role: 'admin'}
    // { model: 'Session', accessType: 'READ', property: 'findById' }
    function authorize(restriction) {
        if (restriction.role) {
            return authorizations.roles.indexOf(restriction.role) !== -1;
        } else if (restriction.model) {
            // If any authorization for the model is present, return true
            return authorizations.acls && authorizations.acls.filter(function(acl) {
                return acl.model === restriction.model;
            }).length > 0;
        }
    }

    // Logics to stop all routing before authorizations have been loaded for application
    function interceptRoutes() {

        fetchAuthorizations(coAuthConfig.loginState);

        $rootScope.$on('$stateChangeStart', function(event, toState, toParams) {

            // AUTHENTICATED
            // =============
            if (LoopBackAuth.currentUserId) {
                if (toState.name === coAuthConfig.loginState || toState.name === coAuthConfig.registerState) {
                    $log.debug('stateChangeStart:   $authenticated -> root.home');
                    event.preventDefault();
                    $state.go(coAuthConfig.goToStateAfterLogin);
                } else if (!authorizationsLoaded && toState.name !== coAuthConfig.loadingState) {
                    // authorization data hasn't loaded yet, show loading screen

                    event.preventDefault();

                    // remember where we were going before going to loading state
                    toDuringLoad = {
                        // going to root should default to coAuthConfig.goToStateAfterLogin
                        stateName: toState.name === coAuthConfig.rootState ? coAuthConfig.goToStateAfterLogin : toState.name,
                        paramsId: toParams.id
                    };

                    // authorizations haven't loaded yet, route to coAuthConfig.loadingState
                    $state.go(coAuthConfig.loadingState);

                } else if (toState.name === coAuthConfig.loadingState) {
                    // loading, add pending routing after initial request is done

                    getAuthPromise().then(function() {
                        event.preventDefault();
                        if (toDuringLoad && toDuringLoad.stateName === '404') {
                            $location.path('/');
                        } else if (toDuringLoad && toDuringLoad.stateName) {
                            $state.go(toDuringLoad.stateName, { id: toDuringLoad.paramsId });
                        } else {
                            $state.go(coAuthConfig.goToStateAfterLogin);
                        }
                    });
                }
            } else {

                // NOT AUTHENTICATED
                // =================
                if (!(toState.name === coAuthConfig.loginState || toState.name === coAuthConfig.registerState)) {
                    event.preventDefault();
                    $state.go(coAuthConfig.loginState);
                }
            }
        });
    }

    return service;
});
