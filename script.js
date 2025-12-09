/**
 * script.js: 3x3x3ルービックキューブの完全な回転ロジックとシャッフル機能
 * U, D, R, L, F, Bキーで面を回転させられます。
 */

let scene, camera, renderer, controls;
let cubeGroup; // 26個の小キューブをまとめるグループ
const CUBE_SIZE = 0.9; 
const SPACING = 0.1; 

// 6色のマテリアルを定義 (右, 左, 上, 下, 前, 後 の順)
const colors = [
    new THREE.MeshLambertMaterial({ color: 0xFF0000 }), // 右: 赤
    new THREE.MeshLambertMaterial({ color: 0xFF8C00 }), // 左: オレンジ
    new THREE.MeshLambertMaterial({ color: 0x00FF00 }), // 上: 緑
    new THREE.MeshLambertMaterial({ color: 0x0000FF }), // 下: 青
    new THREE.MeshLambertMaterial({ color: 0xFFFFFF }), // 前: 白
    new THREE.MeshLambertMaterial({ color: 0xFFFF00 })  // 後: 黄
];
const hiddenMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 }); // 内部の面の色

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

    // イベントリスナー
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyPress); 

    // キューブを初期化後、シャッフルを開始
    scrambleCube(); 
    
    animate();
}

// ----------------------------------------------------
// キューブ作成ロジック
// ----------------------------------------------------

function createCubeMaterials(x, y, z) {
    const materials = [];
    
    // 外側を向いている面だけに色を付ける
    materials.push(x === 1 ? colors[0] : hiddenMaterial); 
    materials.push(x === -1 ? colors[1] : hiddenMaterial);
    materials.push(y === 1 ? colors[2] : hiddenMaterial); 
    materials.push(y === -1 ? colors[3] : hiddenMaterial);
    materials.push(z === 1 ? colors[4] : hiddenMaterial); 
    materials.push(z === -1 ? colors[5] : hiddenMaterial);

    return materials;
}

function createRubiksCube() {
    const step = CUBE_SIZE + SPACING;
    
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                // 中心ブロックは除く
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

function scrambleCube() {
    const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
    const count = 20; // 20手ランダムに回す
    const interval = 50; 

    let i = 0;
    
    const scrambleInterval = setInterval(() => {
        if (i >= count) {
            clearInterval(scrambleInterval);
            isRotating = false; 
            return;
        }

        const layer = moves[Math.floor(Math.random() * moves.length)];
        const direction = Math.random() < 0.5 ? 1 : -1; 
        
        rotateLayerSync(layer, direction);

        i++;
    }, interval);
}

// ----------------------------------------------------
// 同期的な回転処理（シャッフル用）
// ----------------------------------------------------

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

    const angle = (Math.PI / 2) * direction; 
    
    rotationGroup.rotateOnWorldAxis(rotationAxis, angle);
    rotationGroup.updateMatrixWorld(true);

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
        
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, targetAngle).multiply(startQuaternion);

        // 滑らかに補間しながら回転
        rotationGroup.quaternion.slerp(targetQuaternion, progress);
        
        if (progress < 1) {
            requestAnimationFrame(animateRotation);
        } else {
            // アニメーション完了後の処理: 回転を固定し、位置を更新
            rotationGroup.quaternion.setFromAxisAngle(rotationAxis, targetAngle).multiply(startQuaternion);
            rotationGroup.updateMatrixWorld(true);

            cubesToRotate.forEach(cube => {
                cubeGroup.attach(cube);
                
                const newPos = cube.position.clone();
                const step = CUBE_SIZE + SPACING;
                
                cube.userData.position = new THREE.Vector3(
                    Math.round(newPos.x / step),
                    Math.round(newPos.y / step),
                    Math.round(newPos.z / step)
                );
                
                cube.rotation.setFromQuaternion(cube.quaternion);
            });
            
            rotationGroup.quaternion.identity();
            cubeGroup.remove(rotationGroup);
            isRotating = false; 
        }
    }

    animateRotation();
}


// キーボード入力処理 (U, D, R, L, F, Bキーで面回転)
function onKeyPress(event) {
    let layer = '';
    let direction = 1; // 1: 正回転 (時計回り), -1: 逆回転 (反時計回り)
    
    switch (event.key.toUpperCase()) {
        case 'R': layer = 'R'; direction = event.shiftKey ? -1 : 1; break; // 右面
        case 'L': layer = 'L'; direction = event.shiftKey ? 1 : -1; break; // 左面
        case 'U': layer = 'U'; direction = event.shiftKey ? -1 : 1; break; // 上面
        case 'D': layer = 'D'; direction = event.shiftKey ? 1 : -1; break; // 下面
        case 'F': layer = 'F'; direction = event.shiftKey ? -1 : 1; break; // 前面
        case 'B': layer = 'B'; direction = event.shiftKey ? 1 : -1; break; // 後面
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