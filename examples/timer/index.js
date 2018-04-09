'use strict';

const Bot = require('dingbot');
const { asyncWrap } = require('fc-helper');
const API = require('./api');

const api = new API('<UID>', '<API SECRET>');
const bot = new Bot('https://oapi.dingtalk.com/robot/send?access_token=<ACCESS TOKEN>');

exports.handler = asyncWrap(async function (event, contenxt) {
  const cityName = '杭州';
  const data = await api.getWeatherDaily(cityName);
  const city = data.results.find((item) => {
    return item.location.name === cityName;
  });

  const [ today, tomorrow ] = city.daily;

  const title = `${cityName}天气`;
  const markdown = `### ${cityName}天气
#### 今天
白天，![${today.text_day}](https://s2.sencdn.com/web/icons/3d_50/${today.code_day}.png)；晚上，![${today.text_night}](https://s2.sencdn.com/web/icons/3d_50/${today.code_night}.png)。${today.low}到${today.high}度，${today.wind_direction}风${today.wind_scale}级

#### 明天
白天，![${tomorrow.text_day}](https://s2.sencdn.com/web/icons/3d_50/${tomorrow.code_day}.png)；晚上，![${tomorrow.text_night}](https://s2.sencdn.com/web/icons/3d_50/${tomorrow.code_night}.png)。${tomorrow.low}到${tomorrow.high}度，${tomorrow.wind_direction}风${tomorrow.wind_scale}级
`;

  await bot.markdown(title, markdown);
  return city;
});
