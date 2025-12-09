/**
 * script.js: 3x3x3ルービックキューブの完全な回転ロジックとシャッフル機能
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
    controls.enableDamping = true; 
    controls.dampingFactor = 0.05;

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyPress);
    
    // キューブを初期化後、シャッフルを開始 **(ここが変更点)**
    scrambleCube(); 
    
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
    
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && y === 0 && z === 0) continue; 
                
                const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
                const materials = createCubeMaterials(x, y, z);
                
                const cube = new THREE.Mesh(geometry, materials);
                
                cube.position.x = x * step;
                cube.position.y = y * step;
                cube.position.z = z * step;
                
                cube.userData.position = new THREE.Vector3(x, y, z); 
                cubeGroup.add(cube);
            }
        }
    }
}

// ----------------------------------------------------
// シャッフル（スクランブル）ロジック
// ----------------------------------------------------

/**
 * 20手ランダムにキューブを回転させ、シャッフルする
 */
function scrambleCube() {
    const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
    const count = 20; 
    const interval = 50; // 50msごとに次の手を適用

    let i = 0;
    
    // 回転アニメーションを一時的に無効化し、シャッフルを高速で行うためのタイマー処理
    const scrambleInterval = setInterval(() => {
        if (i >= count) {
            clearInterval(scrambleInterval);
            isRotating = false; // シャッフル完了
            return;
        }

        const layer = moves[Math.floor(Math.random() * moves.length)];
        const direction = Math.random() < 0.5 ? 1 : -1; 
        
        // アニメーションを伴わない即座の回転処理 (アニメーション完了を待たない)
        rotateLayerSync(layer, direction);

        i++;
    }, interval);
}

// ----------------------------------------------------
// 同期的な回転処理（シャッフル用）
// ----------------------------------------------------
// rotateLayerをベースに、アニメーション部分を省略し、即座に回転を適用する関数

function rotateLayerSync(layer, direction) {
    let axis, value, rotationAxis;

    switch (layer) {
        case 'R': axis = 'x'; value = 1; rotationAxis = new THREE.Vector3(1, 0, 0); break; 
        case 'L': axis = 'x'; value = -1; rotationAxis = new THREE.Vector3(-1, 0, 0); break; 
        case 'U': axis = 'y'; value = 1; rotationAxis = new THREE.Vector3(0, 1, 0); break; 
        case 'D': axis = 'y'; value = -1; rotationAxis = new THREE.Vector3(0, -1, 0); break; 
        case 'F': axis = 'z'; value = 1; rotationAxis = new THREE.Vector3(0, 0, 1); break; 
        case 'B': axis = 'z'; value = -1; rotationAxis = new THREE.Vector3(0, 0, -1); break; 
        default: return;
    }

    const cubesToRotate = cubeGroup.children.filter(cube => 
        Math.round(cube.userData.position[axis]) === value
    );
    
    const rotationGroup = new THREE.Group();
    cubeGroup.add(rotationGroup);
    cubesToRotate.forEach(cube => {
        rotationGroup.attach(cube);
    });

    const angle = (Math.PI / 2) * direction; // 90度または-90度
    
    // *** アニメーションなしで即座に回転を適用 ***
    rotationGroup.rotateOnWorldAxis(rotationAxis, angle);
    rotationGroup.updateMatrixWorld(true);

    // 回転後の位置と向きを更新
    cubesToRotate.forEach(cube => {
        cubeGroup.attach(cube);
        
        const newPos = cube.position.clone();
        const step = CUBE_SIZE + SPACING;
        
        cube.userData.position = new THREE.Vector3(
            Math.round(newPos.x / step),
            Math.round(newPos.y / step),
            Math.round(newPos.z / step)
        );
    });
    
    cubeGroup.remove(rotationGroup);
}

// ----------------------------------------------------
// アニメーション付き回転処理（ユーザー操作用）
// ----------------------------------------------------

let isRotating = false;

// ユーザー操作による回転関数 (アニメーション付き)
function rotateLayer(layer, direction) {
    if (isRotating) return;
    isRotating = true;

    let axis, value, rotationAxis;

    switch (layer) {
        case 'R': axis = 'x'; value = 1; rotationAxis = new THREE.Vector3(1, 0, 0); break; // Right (x=1)
        case 'L': axis = 'x'; value = -1; rotationAxis = new THREE.Vector3(-1, 0, 0); break; // Left (x=-1)
        case 'U': axis = 'y'; value = 1; rotationAxis = new THREE.Vector3(0, 1, 0); break; // Up (y=1)
        case 'D': axis = 'y'; value = -1; rotationAxis = new THREE.Vector3(0, -1, 0); break; // Down (y=-1)
        case 'F': axis = 'z'; value = 1; rotationAxis = new THREE.Vector3(0, 0, 1); break; // Front (z=1)
        case 'B': axis = 'z'; value = -1; rotationAxis = new THREE.Vector3(0, 0, -1); break; // Back (z=-1)
        default: isRotating = false; return;
    }

    const cubesToRotate = cubeGroup.children.filter(cube => 
        Math.round(cube.userData.position[axis]) === value
    );
    
    const rotationGroup = new THREE.Group();
    cubeGroup.add(rotationGroup);
    cubesToRotate.forEach(cube => {
        rotationGroup.attach(cube);
    });

    const targetAngle = (Math.PI / 2) * direction; // 目標角度
    const duration = 250; // アニメーション時間 (ms)
    const startTime = Date.now();
    const startQuaternion = rotationGroup.quaternion.clone();

    function animateRotation() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // ターゲットクォータニオンの計算
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, targetAngle).multiply(startQuaternion);

        // 線形補間
        rotationGroup.quaternion.slerp(targetQuaternion, progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            // アニメーション完了後の処理
            
            // 完全に目標角度に設定し直し、クォータニオンをクリア
            rotationGroup.quaternion.setFromAxisAngle(rotationAxis, targetAngle).multiply(startQuaternion);
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
                
                // 回転後のローカルな回転情報も更新（この処理が重要）
                cube.rotation.setFromQuaternion(cube.quaternion);
            });
            
            rotationGroup.quaternion.identity(); // rotationGroupの回転をリセット
            cubeGroup.remove(rotationGroup);
            isRotating = false; 
        }
    }

    animateRotation();
}


// キーボード入力処理
function onKeyPress(event) {
    let layer = '';
    let direction = 1; // 1: 正回転 (時計回り), -1: 逆回転 (反時計回り)
    
    switch (event.key.toUpperCase()) {
        case 'R': layer = 'R'; direction = event.shiftKey ? -1 : 1; break; 
        case 'L': layer = 'L'; direction = event.shiftKey ? 1 : -1; break; 
        case 'U': layer = 'U'; direction = event.shiftKey ? -1 : 1; break; 
        case 'D': layer = 'D'; direction = event.shiftKey ? 1 : -1; break; 
        case 'F': layer = 'F'; direction = event.shiftKey ? -1 : 1; break; 
        case 'B': layer = 'B'; direction = event.shiftKey ? 1 : -1; break; 
        default: return;
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
        controls.update(); 
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('load', init);