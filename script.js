/**
 * script.js: 3x3x3ルービックキューブの完全な回転ロジック
 */

let scene, camera, renderer, controls;
let cubeGroup; // 26個の小キューブをまとめるグループ
const CUBE_SIZE = 0.9; // キューブのサイズ
const SPACING = 0.1; // 隙間
const CUBE_DIM = 3;  // 3x3x3

// 6色のマテリアルを定義 (右, 左, 上, 下, 前, 後 の順)
const colors = [
    new THREE.MeshLambertMaterial({ color: 0xFF0000 }), // 右: 赤
    new THREE.MeshLambertMaterial({ color: 0xFF8C00 }), // 左: オレンジ
    new THREE.MeshLambertMaterial({ color: 0x00FF00 }), // 上: 緑
    new THREE.MeshLambertMaterial({ color: 0x0000FF }), // 下: 青
    new THREE.MeshLambertMaterial({ color: 0xFFFFFF }), // 前: 白
    new THREE.MeshLambertMaterial({ color: 0xFFFF00 })  // 後: 黄
];
const hiddenMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 }); // 内部の面の色 (黒に近い)

// 初期化関数
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 3, 5);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x333333);
    document.body.appendChild(renderer.domElement);

    // ライト
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.8, 5, 5, 5));

    // キューブ作成
    cubeGroup = new THREE.Group();
    createRubiksCube();
    scene.add(cubeGroup);
    
    // カメラ操作 (マウスで視点変更)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 滑らかな動き
    controls.dampingFactor = 0.05;

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyPress);
    
    animate();
}

// 小キューブのマテリアル（色の決定）
function createCubeMaterials(x, y, z) {
    const materials = [];
    
    // 0: 右 (+x) | 1: 左 (-x)
    materials.push(x === 1 ? colors[0] : hiddenMaterial); 
    materials.push(x === -1 ? colors[1] : hiddenMaterial);

    // 2: 上 (+y) | 3: 下 (-y)
    materials.push(y === 1 ? colors[2] : hiddenMaterial); 
    materials.push(y === -1 ? colors[3] : hiddenMaterial);

    // 4: 前 (+z) | 5: 後 (-z)
    materials.push(z === 1 ? colors[4] : hiddenMaterial); 
    materials.push(z === -1 ? colors[5] : hiddenMaterial);

    return materials;
}

// 26個の小キューブを生成
function createRubiksCube() {
    const step = CUBE_SIZE + SPACING;
    
    // x, y, z座標を -1, 0, 1 のインデックスで表現
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                // 中心キューブ (0, 0, 0) は描画しない
                if (x === 0 && y === 0 && z === 0) continue; 
                
                const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
                const materials = createCubeMaterials(x, y, z);
                
                const cube = new THREE.Mesh(geometry, materials);
                
                // 位置の設定
                cube.position.x = x * step;
                cube.position.y = y * step;
                cube.position.z = z * step;
                
                // キューブの初期位置を保存 (回転の判定に使用)
                cube.userData.position = new THREE.Vector3(x, y, z); 
                cubeGroup.add(cube);
            }
        }
    }
}

// ----------------------------------------------------
// 回転処理ロジック
// ----------------------------------------------------

// 回転中のフラグ
let isRotating = false;

/**
 * 指定された軸とレイヤーに基づいてキューブ面を回転させる
 * @param {string} layer - 回転させる面 ('R', 'U', 'F'など)
 * @param {number} direction - 回転方向 (1: 正回転, -1: 逆回転)
 */
function rotateLayer(layer, direction) {
    if (isRotating) return;
    isRotating = true;

    let axis, value, rotationAxis;

    switch (layer) {
        case 'R': axis = 'x'; value = 1; rotationAxis = new THREE.Vector3(1, 0, 0); break; // Right (x=1)
        case 'L': axis = 'x'; value = -1; rotationAxis = new THREE.Vector3(-1, 0, 0); break; // Left (x=-1)
        case 'U': axis = 'y'; value = 1; rotationAxis = new THREE.Vector3(0, 1, 0); break; // Up (y=1)
        case 'D': case 'd': axis = 'y'; value = -1; rotationAxis = new THREE.Vector3(0, -1, 0); break; // Down (y=-1)
        case 'F': axis = 'z'; value = 1; rotationAxis = new THREE.Vector3(0, 0, 1); break; // Front (z=1)
        case 'B': axis = 'z'; value = -1; rotationAxis = new THREE.Vector3(0, 0, -1); break; // Back (z=-1)
        default: isRotating = false; return;
    }

    // 回転させるキューブをフィルタリング
    const cubesToRotate = cubeGroup.children.filter(cube => 
        // わずかな誤差を許容して判断
        Math.round(cube.userData.position[axis]) === value
    );
    
    // 一時的な回転グループを作成し、キューブを移動
    const rotationGroup = new THREE.Group();
    cubeGroup.add(rotationGroup);
    cubesToRotate.forEach(cube => {
        rotationGroup.attach(cube);
    });

    const angle = (Math.PI / 2) * direction; // 90度または-90度

    // アニメーションのための変数を準備
    const startAngle = 0;
    const targetAngle = angle;
    const duration = 250; // 250msで回転
    const startTime = Date.now();

    function animateRotation() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const currentAngle = startAngle + (targetAngle * progress);

        // 差分だけ回転させるため、前のフレームの回転角度を計算
        const deltaAngle = currentAngle - rotationGroup.rotation.clone().unproject(rotationAxis)[axis];
        
        rotationGroup.rotateOnWorldAxis(rotationAxis, deltaAngle);

        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            // アニメーション完了後の処理
            rotationGroup.rotation.set(0, 0, 0); // 回転グループの回転をリセット
            rotationGroup.updateMatrixWorld(true);

            // キューブを元のグループに戻し、位置と向きを更新
            cubesToRotate.forEach(cube => {
                cubeGroup.attach(cube);
                
                // 回転後の位置座標を更新 (Three.jsの座標から -1, 0, 1 のグリッド座標に変換)
                const newPos = cube.position.clone();
                const step = CUBE_SIZE + SPACING;
                
                cube.userData.position = new THREE.Vector3(
                    Math.round(newPos.x / step),
                    Math.round(newPos.y / step),
                    Math.round(newPos.z / step)
                );
            });
            
            cubeGroup.remove(rotationGroup);
            isRotating = false; // フラグ解除
        }
    }

    animateRotation();
}

// キーボード入力処理
function onKeyPress(event) {
    let layer = '';
    let direction = 1; // 1: 正回転 (時計回り), -1: 逆回転 (反時計回り)
    
    switch (event.key.toUpperCase()) {
        case 'R': layer = 'R'; direction = 1; break; // Right (R)
        case 'L': layer = 'L'; direction = -1; break; // Left (L')
        case 'U': layer = 'U'; direction = 1; break; // Up (U)
        case 'D': layer = 'D'; direction = -1; break; // Down (D')
        case 'F': layer = 'F'; direction = 1; break; // Front (F)
        case 'B': layer = 'B'; direction = -1; break; // Back (B')
        
        // シフトキーと同時押しで逆回転 (例: r' -> Shift + R)
        case 'R': if (event.shiftKey) { layer = 'R'; direction = -1; } break; 
        case 'L': if (event.shiftKey) { layer = 'L'; direction = 1; } break; 
        case 'U': if (event.shiftKey) { layer = 'U'; direction = -1; } break; 
        case 'D': if (event.shiftKey) { layer = 'D'; direction = 1; } break;
        case 'F': if (event.shiftKey) { layer = 'F'; direction = -1; } break;
        case 'B': if (event.shiftKey) { layer = 'B'; direction = 1; } break;
    }
    
    if (layer) {
        rotateLayer(layer, direction);
    }
}

// ----------------------------------------------------
// 基本アニメーションループとリサイズ処理
// ----------------------------------------------------

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update(); // カメラ操作の更新
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('load', init);