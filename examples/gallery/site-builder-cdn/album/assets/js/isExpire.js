// 判断当前页面是否过期，如果过期，弹出弹窗
function isExpired() {
    var date = parseInt(new Date().getTime()/1000);
    console.log('date',date);

    var url = window.location.href;
    var expireTime = url.split('=')[1];
    var expireTimeStamp = expireTime.split('-')[0];
    //实际过期时间半小时时，就跳出弹窗，提示重新登录
    if (date + 1800 >= expireTimeStamp) {
        console.log('过期了过期了');
        alert("页面已过期，请重新登录");
        //这里需要换成自己的登录页面的链接
        window.location.href = '{loginCDNUrl}';
    } 
}

setInterval("isExpired()", 5000);//隔5秒调用一次方法
