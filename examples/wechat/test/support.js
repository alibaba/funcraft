'use strict';

const crypto = require('crypto');

/* eslint-disable indent */
var tpl = [
  '<xml>',
    '<ToUserName><![CDATA[<%=sp%>]]></ToUserName>',
    '<FromUserName><![CDATA[<%=user%>]]></FromUserName>',
    '<CreateTime><%=(new Date().getTime())%></CreateTime>',
    '<MsgType><![CDATA[<%=type%>]]></MsgType>',
    '<% if (type === "text") { %>',
      '<Content><![CDATA[<%=text%>]]></Content>',
    '<% } else if (type === "location") { %>',
      '<Location_X><%=xPos%></Location_X>',
      '<Location_Y><%=yPos%></Location_Y>',
      '<Scale><%=scale%></Scale>',
      '<Label><![CDATA[<%=label%>]]></Label>',
    '<% } else if (type === "image") { %>',
      '<PicUrl><![CDATA[<%=pic%>]]></PicUrl>',
    '<% } else if (type === "voice") { %>',
      '<MediaId><%=mediaId%></MediaId>',
      '<Format><%=format%></Format>',
    '<% } else if (type === "link") { %>',
      '<Title><![CDATA[<%=title%>]]></Title>',
      '<Description><![CDATA[<%=description%>]]></Description>',
      '<Url><![CDATA[<%=url%>]]></Url>',
    '<% } else if (type === "event") { %>',
      '<Event><![CDATA[<%=event%>]]></Event>',
    '<% if (event === "LOCATION") { %>',
      '<Latitude><%=latitude%></Latitude>',
      '<Longitude><%=longitude%></Longitude>',
      '<Precision><%=precision%></Precision>',
    '<% } %>',
    '<% if (event === "location_select") { %>',
      '<EventKey><![CDATA[6]]></EventKey>',
      '<SendLocationInfo>',
        '<Location_X><![CDATA[<%=xPos%>]]></Location_X>',
        '<Location_Y><![CDATA[<%=yPos%>]]></Location_Y>',
        '<Scale><![CDATA[16]]></Scale>',
        '<Label><![CDATA[<%=label%>]]></Label>',
        '<Poiname><![CDATA[]]></Poiname>',
        '<EventKey><![CDATA[<%=eventKey%>]]></EventKey>',
      '</SendLocationInfo>',
    '<% } %>',
    '<% if (event === "pic_weixin") { %>',
      '<EventKey><![CDATA[someKey]]></EventKey>',
      '<SendPicsInfo>',
        '<Count>1</Count>',
        '<PicList>',
          '<item>',
            '<PicMd5Sum><![CDATA[pic_md5]]></PicMd5Sum> ',
          '</item>',
        '</PicList>',
        '<EventKey><![CDATA[<%=eventKey%>]]></EventKey>',
      '</SendPicsInfo>',
    '<% } %>',
    '<% } %>',
    '<% if (user === "web") { %>',
      'webwx_msg_cli_ver_0x1',
    '<% } %>',
  '</xml>'
].join('');
/* eslint-enable indent */

exports.makeQuery = (token) => {
  var q = {
    timestamp: Date.now(),
    nonce: parseInt((Math.random() * 100000000000), 10)
  };
  var s = [token, q.timestamp, q.nonce].sort().join('');
  q.signature = crypto.createHash('sha1').update(s).digest('hex');
  return q;
};

exports.template = require('ejs').compile(tpl);
