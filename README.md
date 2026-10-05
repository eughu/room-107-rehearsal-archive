# Room 107 · 排练室记忆档案

这是一个纯静态 GitHub Pages 空间档案，包含密码锁入口、第一人称室内漫游，以及排练室照片细节。

## 漫游

门口输入 `175837` 后进入室内。电脑在画面上拖动环顾，使用 WASD 或方向键行走，Shift 慢走。手机左下摇杆移动，画面其余区域拖动环顾；摇杆的方向按钮也支持键盘激活。可回到室内起点、全屏、回门口重新上锁。刷新后需要重新输入密码。

以 1.65 米视高漫游，房间边界与家具使用简化碰撞体，按实际 GLB 家具包围盒生成。入场放置在模型原摄影机附近的通道，不模拟穿过实体门扇。原 GLB 未修改。

密码是怀旧彩蛋，不是安全认证：这是公开静态网站，密码逻辑和模型文件可被访问。不要用于保护私密资料。

## 上传与发布

1. 本项目仓库为 `eughu/room-107-rehearsal-archive`。
2. 所有网站文件与模型均放在仓库根目录。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 选择 **Deploy from a branch**，分支选 `main`，目录选 `/(root)`，保存。
5. 等待 Pages 部署完成，网址为 `https://eughu.github.io/room-107-rehearsal-archive/`。

也可以在本地终端进入这个目录后初始化 Git、提交并推送到你自己的仓库。首次发布前请确认你有权公开模型和照片。GitHub Pages 网站本身是公开可访问的。

## 文件

- `index.html`、`walkthrough.css`：页面与密码锁界面。
- `walkthrough.js`：模型加载、第一人称相机、键盘/触屏交互。
- `navigation.mjs`：门锁校验、行走与碰撞计算。
- `vendor/`：本地托管 Three.js 0.180.0 与 MIT 许可证。
- `rehearsal-room.glb`：约 31 MB 的原始三维模型。
- `room-panorama.png`：全景封面与模型加载海报。
- `memory-wall.png`、`entrance-detail.png`：照片细节展示。

3D 引擎随网站发布，不依赖第三方脚本 CDN。字体加载失败时使用本地备用字体，不影响漫游。

本地预览：在此目录运行 `python3 -m http.server 8765`，浏览器打开 `http://localhost:8765`。验证导航逻辑：`node --test tests/navigation.test.mjs`。
