angular.module('coAuth')

.config(function ($httpProvider, coAuthConfig) {
    $httpProvider.interceptors.push(function($q, $injector, $window) {
        return {
            request: function(config) {
                var urlStart = config.url.slice(0, 4);
                if (coAuthConfig.apiHost && (urlStart === 'api/' || urlStart === '/api')) {
                    config.url = coAuthConfig.apiHost + config.url;
                }
                return config;
            },
            responseError: function (response) {
                if (response.config.params && !response.config.params.muteNotification) {
                    $injector.get('$rootScope').$broadcast('toast', { type: 'error', message: response });
                }
                return $q.reject(response);
            },
            response: function (config) {
                if ((config.config.method === 'POST' || config.config.method === 'PUT') && config.status === 200) {
                    if (config.config.url.indexOf('/Users/login') === -1) {
                        $injector.get('$rootScope').$broadcast('toast', { type: 'success', message: config });
                    }
                }
                return config;
            }
        };
    });
});
