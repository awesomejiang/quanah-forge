# Quanah Forge · 马牌工坊

冒险岛 Quanah 星力与普通潜能计算器。纯静态 HTML / CSS / JavaScript，无需后端。

## 页面

- `index.html`：马牌徽章星力
- `badge-cube.html`：马牌徽章魔方
- `equipment.html`：普通装备星力
- `equipment-cube.html`：普通装备魔方

设置保存在浏览器 localStorage，不上传服务器。更换域名后原有设置不会自动转移。

## 部署

GitHub Settings → Pages → Deploy from a branch，选择 `main` 分支的 `/ (root)`。所有资源使用相对路径，`.nojekyll` 用于直接发布静态文件。

## 验证

安装 Node.js 后运行 `npm test`。本地预览须使用 HTTP 静态服务器，以支持 ES Modules、Web Worker 和 JSON 数据读取。

## 数据来源

- GMS星力数据参考 [AngeloTadeucci/starforcing-calc](https://github.com/AngeloTadeucci/starforcing-calc)。
- Quanah费用来自用户提供的数据及等级费用拟合。
- Black Cube词条数据来自 [MathBro](https://brendonmay.github.io/cubingCalculator/) 的 [cubeRates.js](https://github.com/brendonmay/brendonmay.github.io/blob/master/cubingCalculator/cubeRates.js)，归档日期2023-11-14。
- 魔方计算独立实现，沿用参考模型的心脏词条池作为徽章代理、160级以上数值调整、词条类别限制及社区升阶概率。并非GMS官方完整概率披露。

与Nexon无关联。发布内容不包含ChatGPT Sites身份或部署凭证。
