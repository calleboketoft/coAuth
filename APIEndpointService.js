angular.module('coAuth')

.factory('api', function($http, LoopBackAuth, User, ACL, Role, RoleMapping) {

    var service = {
        User: User,
        ACL: ACL,
        Role: Role,
        RoleMapping: RoleMapping
    };

    function getMyFilter(additionalFilter) {
        var myFilter = {filter: { where: { userId: LoopBackAuth.currentUserId } } };
        if (additionalFilter) {
            angular.extend(myFilter.filter.where, additionalFilter.filter.where);
        }
        return myFilter;
    }

    // special endpoint, should be in user api
    service.requestResetPassword = function(email) {
        return $http.post('/request-password-reset', { email: email });
    }

    return service;
})