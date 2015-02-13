// # Orange Live > Auth
function Auth() {
    //
    var _isAuth = false;
    
    if(localStorage.orangeLiveAuth){
        _isAuth = true;
    }

    return{
        isAuth: isAuth,
        getToken: getToken,
        removeToken: removeToken,
        setToken: setToken
    };

    /*--------------------------------------*/

    // # Is Auth
    function isAuth() {
        return _isAuth;
    }

    // # Get Token
    function getToken() {
        if (_isAuth) {
            return localStorage.orangeLiveAuth;
        }

        return false;
    }

    // Remove Token
    function removeToken() {
        delete localStorage.orangeLiveAuth;
        _isAuth = false;
    }

    // # Set Token
    function setToken(token) {
        localStorage.orangeLiveAuth = token;
        _isAuth = true;
    }
}