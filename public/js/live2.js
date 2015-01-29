$(function(){
    poll(function(data){
        $('#data').append(JSON.stringify(data));
    });
});

function poll(callback){
    $.ajax({
        url: 'get?room=roomTest:' + +new Date,
        success: function(data){
            poll(callback);
            callback(data);
        }
    });
}