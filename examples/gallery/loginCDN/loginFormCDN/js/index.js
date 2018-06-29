var working = false;
var result = {};
$('.login').on('submit', function (e) {
  e.preventDefault();
  if (working) return;
  working = true;
  var name = document.getElementById("username").value;
  var passwd = document.getElementById("password").value;
  var data = {
    name: name,
    password: passwd
  };
  var $this = $(this);
  var $button = $('#loginButton')
  $.ajax({
    type: 'POST',
    url: '{logAuthCDNApiUrl}',
    data: data,
    beforeSend: function () {
      $state = $this.find('button > .state');
      $this.addClass('loading');
      $state.html('Authenticating');
      $button.blur()
    },
    success: function (data) {
      // 密码正确或者错误都会触发 success 回调，正确密码返回的 data 是 { url: '....'}
      // 错误的密码返回的是 {}
      if (data.url) {
        // 密码正确
        console.log('valid username or password');
        var url = data.url;
        window.location.href = url;
      } else {
        // 密码错误
        setTimeout(function () {
          console.log('invalid username or password');
          $this.addClass('ok');
          $state.html('Invalid username or password!');
          setTimeout(function () {
            console.log('wait for login again')
            $state.html('Log in');
            $this.removeClass('ok loading');
            working = false;
          }, 2000)
        }, 2000)
      }
    },
    error: function (...args) {
      setTimeout(function () {
        console.log('request error');
        $this.addClass('ok');
        $state.html('request error');
        setTimeout(function () {
          console.log('wait for login again')
          $state.html('Log in');
          $this.removeClass('ok loading');
          working = false;
        }, 2000)
      }, 2000)
    }
  })
});