const Follower = (function (mesh, goal, movementSpeed, rotationStep) {
    let movementVector = new THREE.Vector2(0, 1);
    const center = new THREE.Vector2(0, 0);
    const maxSpeed = 2 * movementSpeed;
    const defaultSpeed = movementSpeed;
    const rotationStepRadians = rotationStep * Math.PI / 180;

    function getNewMovementVector() {
        const goalVector = new THREE.Vector2(goal.x - mesh.position.x, goal.y - mesh.position.y);
        const goalVectorAngle = goalVector.angle();
        const currentVector = movementVector.clone();
        const currentVectorAngle = currentVector.angle();
        const angleDistance = Math.abs(currentVectorAngle - goalVectorAngle);
        let shorterAngleDistance = angleDistance;
        if (shorterAngleDistance >= Math.PI) {
            shorterAngleDistance = 2 * Math.PI - shorterAngleDistance;
        }
        if (shorterAngleDistance <= rotationStepRadians) {
            return currentVector;
        }
        let rotationSign = 0;
        if (angleDistance <= Math.PI) {
            rotationSign = goalVectorAngle >= currentVectorAngle ? 1 : -1;
        } else {
            rotationSign = goalVectorAngle <= currentVectorAngle ? 1 : -1;
        }
        return currentVector.rotateAround(center, rotationSign * rotationStepRadians);
    }

    return {
        next: function (additionalVectors) {
            if (goal.distanceTo(mesh.position) > 1) {
                const newVector = getNewMovementVector();

                mesh.position.x += newVector.x * movementSpeed;
                mesh.position.y += newVector.y * movementSpeed;

                if (movementVector.equals(newVector)) {
                    if (movementSpeed < maxSpeed) {
                        movementSpeed *= 1.02;
                        if (movementSpeed > maxSpeed) {
                            movementSpeed = maxSpeed;
                        }
                    }
                } else if (movementSpeed > defaultSpeed) {
                    movementSpeed /= 1.04;
                    if (movementSpeed < defaultSpeed) {
                        movementSpeed = defaultSpeed;
                    }
                }
                movementVector.copy(newVector);
                // mesh.rotation.z = movementVector.angle() - Math.PI/2;
            } else {
                movementSpeed = defaultSpeed;
            }
        },

        position: function () {
            return mesh.position;
        },

        speed: function (value) {
            if (value) {
                movementSpeed = value;
            }
            return movementSpeed;
        },

        rotationStep: function (value) {
            if (value) {
                rotationStep = value;
            }
            return rotationStep;
        },

        goal: function (value) {
            if (value) {
                goal = value;
            }
            return goal;
        },

        mesh: function (value) {
            if (value) {
                mesh = value;
            }
            return mesh;
        }
    }
});

const ForcePush = (function (center, direction, width, speed, strength, strengthDecrease, maxSize) {
    let done = false;
    const directionAngle = direction.angle();
    const minDirectionAngle = directionAngle - width;
    const maxDirectionAngle = directionAngle + width;
    const sphere = new THREE.Sphere(new THREE.Vector3(center.x, center.y, 0), 0);
    return {
        next: function() {
            if (sphere.radius < maxSize) {
                sphere.radius += speed;
                strength /= strengthDecrease;
            } else {
                done = true;
            }
        },

        pushVector: function(vector) {
            if (!done) {
                if (sphere.containsPoint(vector)) {
                    const v2 = new THREE.Vector2(vector.x, vector.y);
                    const vectorAngle = v2.sub(center).angle();
                    if (vectorAngle >= minDirectionAngle && vectorAngle <= maxDirectionAngle) {
                        const pushVector = new THREE.Vector3(vector.x - sphere.center.x, vector.y - sphere.center.y, 0).normalize().multiplyScalar(strength);
                        vector.add(pushVector);
                    }
                }
            }
        },
        
        isDone: function () {
            return done;
        }
    }
});
const ShockWave = (function (position, speed, strength, strengthDecrease, maxSize) {
    let done = false;
    const sphere = new THREE.Sphere(new THREE.Vector3(position.x, position.y, 0), 0);
    return {
        next: function () {
            if (sphere.radius < maxSize) {
                sphere.radius += speed;
                strength /= strengthDecrease;
            } else {
                done = true;
            }
        },

        pushVector: function (vector) {
            if (!done) {
                if (sphere.containsPoint(vector)) {
                    const pushVector = new THREE.Vector3(vector.x - sphere.center.x, vector.y - sphere.center.y, 0).normalize().multiplyScalar(strength);
                    vector.add(pushVector);
                }
            }
        },

        isDone: function () {
            return done;
        }
    }
});

const app = 
(function () {
    let scene = new THREE.Scene();
    const width = window.innerWidth;
    const height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100000);


    var planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    let renderer = new THREE.WebGLRenderer({
        antialias: true
    });
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

    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    window.addEventListener('resize', onWindowResize, false);

    function createCone(color) {
        let geometry = new THREE.CircleGeometry(1, 32);
        let material = new THREE.MeshBasicMaterial({
            color: color
        });
        let cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        return cube;
    }
    const shockwaves = [];

    let mouseDownTimeStamp = 0;
    let mouseDownPosition = null;

    function onDocumentMouseDown(event) {
        mouseDownTimeStamp = event.timeStamp;
        mouseDownPosition = goal.clone();
    }

    let speed = 1;
    let str = 2.5;
    let strDec = 1.02;
    let rad = 100;

    function onDocumentMouseUp(event) {
        let mouseUpPosition = goal.clone();
        let timeDiff = (event.timeStamp - mouseDownTimeStamp) / 2000;
        if (timeDiff > 1) timeDiff = 1;
        timeDiff += 1;

        let distance = mouseDownPosition.distanceTo(mouseUpPosition);
        if (distance >= 2) {
            const direction = new THREE.Vector2(mouseDownPosition.x - mouseUpPosition.x, mouseDownPosition.y - mouseUpPosition.y);
            console.log(distance); // radius
            shockwaves.push(new ForcePush(mouseUpPosition, direction, 0.4, speed, str * 2 * timeDiff, strDec, distance * 2));
        } else {
            shockwaves.push(new ShockWave(goal, speed, str * timeDiff, strDec, rad));
        }
    }

    function onDocumentMouseMove(event) {
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

    function createColorRange(ran) {
        const tmpColor = new THREE.Color();
        const r = c1.r + ((ran * (c2.r - c1.r)));
        const g = c1.g + ((ran * (c2.g - c1.g)));
        const b = c1.b + ((ran * (c2.b - c1.b)));

        tmpColor.setRGB(r, g, b);

        return tmpColor;
    };

    for (let i = 0; i < 500; i++) {
        const random = Math.random();
        const speedRandom = random * 0.7 + 0.3;
        followers.push(
            new Follower(createCone(createColorRange(random)), goal, speedRandom, speedRandom * 10)
        );
    }

    function animate() {
        requestAnimationFrame(animate);

        manageRaycasterIntersections(scene, camera);
        shockwaves.forEach(shockwave => {
            shockwave.next();
        });
        followers.forEach(follower => {
            shockwaves.forEach(shockwave => {
                shockwave.pushVector(follower.position());
            });
            follower.next();
        });

        if (shockwaves.length) {
            for (let i = shockwaves.length - 1; i >= 0; i--) {
                if (shockwaves[i].isDone()) {
                    shockwaves.splice(i, 1);
                }
            }
        }

        renderer.render(scene, camera);
    }
    animate();

    return {
        
            // let speed = 1;
            // let str = 5;
            // let strDec = 1.02;
            // let rad = 100;
        speed(val) {
            if (val) speed = val;
            return speed;
        },
        str(val) {
            if (val) str = val;
            return str;
        },
        strDec(val) {
            if (val) strDec = val;
            return strDec;
        },
        rad(val) {
            if (val) rad = val;
            return rad;
        },
    }
})();