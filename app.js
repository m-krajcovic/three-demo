const Follower = (function(mesh, goal, movementSpeed, rotationStep) {
    let movementVector = new THREE.Vector2(0, 1);
    const center = new THREE.Vector2(0, 0);
    function getNewMovementVector() {
        const currentVector = movementVector.clone();
        const plusVector = movementVector.clone().rotateAround(center, rotationStep * Math.PI/180);
        const minusVector = movementVector.clone().rotateAround(center, -rotationStep * Math.PI/180);
        const distances = [
            currentVector.clone().add(mesh.position).distanceToSquared(goal), 
            plusVector.clone().add(mesh.position).distanceToSquared(goal), 
            minusVector.clone().add(mesh.position).distanceToSquared(goal)];
        const minIndex = utils.indexOfMin(distances);
        return [currentVector, plusVector, minusVector][minIndex];
    }

    return {
        next: function() {
            if (goal.distanceTo(mesh.position) > 1) {
                movementVector.copy(getNewMovementVector());
                mesh.position.x += movementVector.x * movementSpeed;
                mesh.position.y += movementVector.y * movementSpeed;
                // mesh.rotation.z = movementVector.angle() - Math.PI/2;
            }
        },

        speed: function(value) {
            if (value) {
                movementSpeed = value;
            }
            return movementSpeed;
        },

        rotationStep: function(value) {
            if (value) {
                rotationStep = value;
            }
            return rotationStep;
        },

        goal: function(value) {
            if (value) {
                goal = value;
            }
            return goal;
        },

        mesh: function(value) {
            if (value) {
                mesh = value;
            }
            return mesh;
        }
    }
});

(function() {
let scene = new THREE.Scene();
const width = window.innerWidth;
const height = window.innerHeight;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100000);


var planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

let renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 150;

let movementSpeed = 0.5;
let rotationSpeed = 0.1;

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let goal = new THREE.Vector2();

renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
renderer.domElement.addEventListener('touchmove', onDocumentMouseMove, false);
window.addEventListener('resize', onWindowResize, false);

function createCone(color) {
    let geometry = new THREE.CircleGeometry( 1, 32 );
    let material = new THREE.MeshBasicMaterial({color: color});
    let cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    return cube;
}

function onDocumentMouseMove(event) {
    console.log(event);
    event.preventDefault();
    let mouseX, mouseY;
    if (event.touches && event.touches.length) {
    	mouseX = event.touches[0].clientX;
	mouseY = event.touches[0].clientY;
    } else {
    	mouseX = event.clientX;
	mouseY = event.clientY;
    }
    mouse.x = (mouseX / window.innerWidth) * 2 - 1;
    mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function manageRaycasterIntersections(scene, camera) {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(mouse, camera);
    // var intersects = raycaster.intersectObjects(scene.children);
    
    // if (intersects.length > 0) {
        
    // } 
    // else {

    // }

    const pos = raycaster.ray.intersectPlane(planeZ);
    goal.copy(pos);
}

const followers = [];
const c1 = new THREE.Color(0xff4e50);
const c2 = new THREE.Color(0xf9d423);
// #ff4e50 → #f9d423

function createColorRange(ran) {
    const tmpColor = new THREE.Color();
    const r = c1.r + ((ran*(c2.r-c1.r)));
    const g = c1.g + ((ran*(c2.g-c1.g)));
    const b = c1.b + ((ran*(c2.b-c1.b)));

    tmpColor.setRGB(r, g, b);
    
    return tmpColor;
};

for (let i = 0; i < 500; i++) {
    const random = Math.random();
    const speedRandom = random * 0.7 + 0.3;
    followers.push(
        new Follower(createCone(createColorRange(random)), goal, speedRandom, speedRandom*10)
    );
}

function animate() {
    requestAnimationFrame(animate);

    manageRaycasterIntersections(scene, camera);

    followers.forEach(follower => {
        follower.next();
    });

    renderer.render(scene, camera);
}
animate()})();
