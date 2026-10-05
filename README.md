# Room 107 · 排练室记忆档案

这是一个纯静态 GitHub Pages 展示页，包含可拖拽旋转、缩放的 GLB 模型，以及排练室照片细节。所有文件放在仓库根目录，上传时一次选中全部文件即可。

## 上传与发布

1. 本项目仓库为 `eughu/room-107-rehearsal-archive`。
2. 所有网站文件与模型均放在仓库根目录。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 选择 **Deploy from a branch**，分支选 `main`，目录选 `/(root)`，保存。
5. 等待 Pages 部署完成，网址为 `https://eughu.github.io/room-107-rehearsal-archive/`。

也可以在本地终端进入这个目录后初始化 Git、提交并推送到你自己的仓库。首次发布前请确认你有权公开模型和照片。GitHub Pages 网站本身是公开可访问的。

## 文件

- `index.html`：页面与 3D 交互控件。
- `rehearsal-room.glb`：约 31 MB 的原始三维模型。
- `room-panorama.png`：全景封面与模型加载海报。
- `memory-wall.png`、`entrance-detail.png`：照片细节展示。

3D 查看器从 Google Hosted Libraries 加载 `<model-viewer>`，因此访客浏览时需要网络连接。
