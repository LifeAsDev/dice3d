import * as THREE from "three";
import * as CANNON from "cannon-es";
const faceNormals = [
	new THREE.Vector3(1, 0, 0),
	new THREE.Vector3(-1, 0, 0),
	new THREE.Vector3(0, 1, 0),
	new THREE.Vector3(0, -1, 0),
	new THREE.Vector3(0, 0, 1),
	new THREE.Vector3(0, 0, -1),
]; // Rotación muy aleatoria
const minSpin = 5;
const maxSpin = 10;
const randomSpin = () =>
	(Math.random() * (maxSpin - minSpin) + minSpin) *
	(Math.random() < 0.5 ? -1 : 1);
let nextDiceId = 0;

export default class DiceScene {
	constructor(
		clickDiceCallback,
		bounds = {
			minX: -4.5,
			maxX: 4.5,
			minZ: -1.5,
			maxZ: 2.5,
		},
		helper = false
	) {
		/* 		this.diceSprite = document.getElementById("dice-sprite");
		 */ this.faceSelected = 1;
		this.helper = helper;
		this.bounds = bounds;
		this.velocityThreshold = 0.1;
		this.angularVelocityThreshold = 0.1;
		this.diceSize = 1;
		this.prop = [-100, 40];
		this.dices = new Map();
		this.init();
		this.onLocked = null;
		this.faceNormals = [
			new THREE.Vector3(1, 0, 0),
			new THREE.Vector3(-1, 0, 0),
			new THREE.Vector3(0, 1, 0),
			new THREE.Vector3(0, -1, 0),
			new THREE.Vector3(0, 0, 1),
			new THREE.Vector3(0, 0, -1),
		];
		this.clickDiceCallback = clickDiceCallback;
		this.results = {
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
			6: 0,
		};
		this.onUnlocked = null;
		this.onRollEnd = null;
		this.hovering = null;
	}

	init() {
		this.initScene();
		this.initPhysics();

		this.animate();
		this.bindEvents();
	}

	initScene() {
		this.container = document.getElementById("scene-container");
		const containerWidth = this.container.clientWidth;
		const containerHeight = this.container.clientHeight;

		const aspect = containerWidth / containerHeight;

		const frustumSize = 10;
		this.camera = new THREE.OrthographicCamera(
			(-frustumSize * aspect) / 2,
			(frustumSize * aspect) / 2,
			frustumSize / 2,
			-frustumSize / 2,
			0.1,
			50
		);
		this.camera.position.set(0, 16, 8);
		this.camera.lookAt(0, 0, 0);

		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		this.renderer.outputEncoding = THREE.LinearSRGBColorSpace;

		this.renderer.setSize(containerWidth, containerHeight);
		this.container.appendChild(this.renderer.domElement);

		const resizeObserver = new ResizeObserver(() => {
			this.onWindowResize(); // o cámbiale el nombre si prefieres
		});

		resizeObserver.observe(this.container);

		this.onWindowResize();
	}

	onWindowResize() {
		const containerWidth = this.container.clientWidth;
		const containerHeight = this.container.clientHeight;

		const aspect = containerWidth / containerHeight;
		const frustumSize = 10;

		this.camera.left = (-frustumSize * aspect) / 2;
		this.camera.right = (frustumSize * aspect) / 2;
		this.camera.top = frustumSize / 2;
		this.camera.bottom = -frustumSize / 2;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(containerWidth, containerHeight);
	}

	initPhysics() {
		this.world = new CANNON.World({
			gravity: new CANNON.Vec3(0, this.prop[0], 0),
		});

		// Material rebotante y sin fricción
		const wallMaterial = new CANNON.Material("wallMaterial");
		const wallContact = new CANNON.ContactMaterial(wallMaterial, wallMaterial, {
			friction: 0.4,
			restitution: 1.0,
		});
		this.world.addContactMaterial(wallContact);

		// Suelo
		this.groundBody = new CANNON.Body({
			mass: 0,
			shape: new CANNON.Plane(),
			material: wallMaterial,
		});
		this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
		this.world.addBody(this.groundBody);
	}

	initDice(
		diceSize = 1,
		diceFaces = [
			[0, 3],
			[1, 3],
			[2, 1],
			[3, 1],
			[4, 2],
			[5, 2],
		],
		color = "rgb(91, 102, 159)",
		lockedSize = 1
	) {
		const loader = new THREE.TextureLoader();
		const faceOrder = [1, 3, 6, 5, 2, 4]; // tus caras 1–6 en orden de cubo

		// Función para crear textura con número en canvas
		function createNumberTexture(num) {
			const size = 128;
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext("2d");
			ctx.strokeStyle = color; // Cambia este valor al color que quieras (ej: rojo)
			ctx.lineWidth = 15; // Cambia este valor al ancho del borde que quieras
			ctx.strokeRect(0, 0, size, size); // Dibuja el rectángulo del borde

			ctx.fillStyle = "white";
			ctx.font = "bold 96px LeagueSpartan-Bold";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(num.toString(), size / 2, size / 2);
			const texture = new THREE.CanvasTexture(canvas);

			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			return texture;
		}

		function createNumberTextureWithImage(num, tex) {
			const size = 128;
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext("2d");

			ctx.drawImage(tex.image, 0, 0, size, size);

			ctx.strokeStyle = color; // Cambia este valor al color que quieras (ej: rojo)
			ctx.lineWidth = 15; // Cambia este valor al ancho del borde que quieras
			ctx.strokeRect(0, 0, size, size); // Dibuja el rectángulo del borde

			// Dibuja número encima
			ctx.fillStyle = "white";
			ctx.font = "bold 39px LeagueSpartan-Bold";

			if (num > 0) {
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(num.toString(), 100, 100);
			}

			// Crea textura de Three.js

			const texture = new THREE.CanvasTexture(canvas);

			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.colorSpace = THREE.SRGBColorSpace;

			return texture;
		}

		const materials = faceOrder.map((face, index) => {
			const diceAnimationFrame = diceFaces[face - 1][1];
			const dicePip = diceFaces[face - 1][0];

			const fallbackTexture = createNumberTexture(diceFaces[face - 1][0]);
			const material = new THREE.MeshBasicMaterial({
				map: fallbackTexture,
			});
			loader.load(
				`/dice${diceAnimationFrame}.png`,
				(tex) => {
					tex.minFilter = THREE.LinearFilter;
					tex.magFilter = THREE.LinearFilter;
					tex.needsUpdate = true;

					// Si carga bien, reemplazamos la textura del material
					material.map = createNumberTextureWithImage(dicePip, tex);
					material.needsUpdate = true;
				},
				undefined,
				() => {
					console.warn(
						`No se pudo cargar la textura /dice${i}.png, se usará número`
					);
					// El material ya tiene la textura de número, no hay que hacer nada
				}
			);

			return material;
		});

		const newDice = new Dice(
			this.scene,
			this.world,
			diceSize,
			new THREE.Vector3(0, 2, 0),
			materials,
			lockedSize
		);
		newDice.color = color;
		this.dices.set(newDice.id, newDice);

		newDice.diceBody.position.set(0, 2, 0);

		// Materiales
		const diceMaterial = new CANNON.Material("diceMaterial");
		const groundMaterial = new CANNON.Material("groundMaterial");

		// Asignar materiales
		newDice.diceBody.material = diceMaterial;
		this.groundBody.material = groundMaterial;

		// Dado vs piso -> Con fricción
		const diceGroundContact = new CANNON.ContactMaterial(
			diceMaterial,
			groundMaterial,
			{
				friction: 0.8, // Ajusta según necesidad
				restitution: 0, // Rebote
			}
		);
		this.world.addContactMaterial(diceGroundContact);

		// Dado vs dado -> Sin fricción
		const diceDiceContact = new CANNON.ContactMaterial(
			diceMaterial,
			diceMaterial,
			{
				friction: 0.0, // Sin fricción entre dados
				restitution: 1, // Rebote
			}
		);
		this.world.addContactMaterial(diceDiceContact);

		newDice.diceBody.angularDamping = 0.1;
		newDice.diceBody.linearDamping = 0.5;

		newDice.diceBody.allowSleep = true;
		newDice.diceBody.sleepSpeedLimit = 0.05;
		newDice.diceBody.sleepTimeLimit = 0.5;
		return newDice.id;
	}

	updateDiceFaces(ownerId, newFaces) {
		for (const [diceId, dice] of this.dices.entries()) {
			if (dice.ownerId !== ownerId) continue; // Solo procesar dados con el ownerId especificado

			const loader = new THREE.TextureLoader();
			const faceOrder = [1, 3, 6, 5, 2, 4]; // Orden de las caras del cubo

			// Actualizar materiales de las caras
			const newMaterials = faceOrder.map((face, index) => {
				const diceAnimationFrame = newFaces[face - 1][1];
				const dicePip = newFaces[face - 1][0];

				const fallbackTexture = this.createNumberTexture(dicePip, dice.color);
				const material = new THREE.MeshBasicMaterial({
					map: fallbackTexture,
				});
				loader.load(
					`/dice${diceAnimationFrame}.png`,
					(tex) => {
						tex.minFilter = THREE.LinearFilter;
						tex.magFilter = THREE.LinearFilter;
						tex.needsUpdate = true;

						// Reemplazar textura con la imagen cargada
						material.map = this.createNumberTextureWithImage(
							dicePip,
							tex,
							dice.color
						);
						material.needsUpdate = true;
					},
					undefined,
					() => {
						console.warn(
							`Failed to load texture /dice${diceAnimationFrame}.png, using fallback.`
						);
					}
				);

				return material;
			});

			// Asignar los nuevos materiales al dado
			dice.diceMesh.material = newMaterials;
			dice.diceMesh.material.needsUpdate = true;
		}
	}

	createNumberTexture(num, color) {
		const size = 128;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");

		ctx.strokeStyle = color;
		ctx.lineWidth = 15;
		ctx.strokeRect(0, 0, size, size);

		ctx.fillStyle = "white";
		ctx.font = "bold 96px LeagueSpartan-Bold";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(num.toString(), size / 2, size / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		return texture;
	}

	createNumberTextureWithImage(num, tex, color) {
		const size = 128;
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");

		ctx.drawImage(tex.image, 0, 0, size, size);

		ctx.strokeStyle = color;
		ctx.lineWidth = 15;
		ctx.strokeRect(0, 0, size, size);

		ctx.fillStyle = "white";
		ctx.font = "bold 39px LeagueSpartan-Bold";
		if (num > 0) {
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(num.toString(), 100, 100);
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.colorSpace = THREE.SRGBColorSpace;
		return texture;
	}

	destroyDice(diceId) {
		const dice = this.dices.get(diceId);
		if (!dice) return;

		this.world.removeBody(dice.diceBody);
		this.scene.remove(dice.diceMesh);

		dice.diceMesh.geometry.dispose();
		dice.diceMesh.material.forEach((mat) => {
			if (mat.map) mat.map.dispose();
			mat.dispose();
		});

		this.dices.delete(diceId);
	}

	destroyAllDiceByOwner(ownerId) {
		const toDelete = [];

		for (const [diceId, dice] of this.dices.entries()) {
			if (dice.ownerId === ownerId) {
				toDelete.push(diceId);
			}
		}

		for (const diceId of toDelete) {
			this.destroyDice(diceId);
		}
	}

	animate() {
		requestAnimationFrame(() => this.animate());
		this.world.step(1 / 60);
		let rollAlDices = true;
		let i = -1;
		for (const [id, dice] of this.dices) {
			i++;
			dice.update();
			const body = dice.diceBody;
			const mesh = dice.diceMesh;

			// Clamp posición X
			if (body.position.x < this.bounds.minX) {
				body.position.x = this.bounds.minX;
			}
			if (body.position.x > this.bounds.maxX) {
				body.position.x = this.bounds.maxX;
			}

			// Clamp posición Z
			if (body.position.z < this.bounds.minZ) {
				body.position.z = this.bounds.minZ;
			}
			if (body.position.z > this.bounds.maxZ) {
				body.position.z = this.bounds.maxZ;
			}
			const linearVel = dice.diceBody.velocity.length();
			const angularVel = dice.diceBody.angularVelocity.length();

			function updateDiceScale(dice) {
				const y = dice.diceBody.position.y;

				// Lógica: cuanto más alto, más grande, empezando desde dice.size
				// Escalamos un 20% adicional como máximo por altura
				const growthFactor = 0.1; // Aumenta hasta un 20% en altura
				const cappedY = Math.min(y, 5); // Altura máxima donde el crecimiento se detiene
				const scale = dice.size * (1 + cappedY * growthFactor);

				dice.diceMesh.scale.set(scale, scale, scale);
			}

			if (linearVel < 0.01 && angularVel < 0.01) {
				dice.diceBody.sleep(); // ✅ Forzar sleep manual
			}
			if (dice.isRolling && !dice.isLocked) {
				updateDiceScale(dice);

				if (
					linearVel < this.velocityThreshold &&
					angularVel < this.angularVelocityThreshold
				) {
					dice.isRolling = false;
					const result = dice.getTopFace();
					if (this.onRollEnd) this.onRollEnd(id, result);

					// ✅ Contador
					if (this.results[result] !== undefined) {
						this.results[result]++;
					} else {
						this.results[result] = 1;
					}
					/* 					console.log(this.results);
					 */
				} else {
					rollAlDices = false;
				}
			}
			if (!dice.isRolling && dice.corr) {
				if (dice.corr.rollIndex === dice.rollIndex) {
					dice.diceBody.position.set(...dice.corr.position);
					dice.diceBody.quaternion.set(...dice.corr.quaternion);
					dice.diceBody.velocity.set(...dice.corr.velocity);
					dice.diceBody.angularVelocity.set(...dice.corr.angularVelocity);

					if (!dice.isLocked) {
						dice.animation = true;
						let startTime = 0;
						let duration = 50; // Duración de la interpolación en milisegundos
						let startPosition = dice.diceMesh.position.clone();
						let targetPosition = new THREE.Vector3(...dice.corr.position);
						let targetQuaternion = new THREE.Quaternion(
							...dice.corr.quaternion
						);

						const animateLerp = (now) => {
							if (!startTime) startTime = now;
							const elapsed = now - startTime;
							const t = Math.min(elapsed / duration, 1);

							function easeOutCubic(t) {
								return 1 - Math.pow(1 - t, 3);
							}
							function easeOutQuad(x) {
								return 1 - (1 - x) * (1 - x);
							}
							function easeOutQuart(t) {
								return 1 - Math.pow(1 - t, 4);
							}
							function easeOutSine(x) {
								return Math.sin((x * Math.PI) / 2);
							}

							const easedT = easeOutSine(t);
							dice.diceMesh.position.lerpVectors(
								startPosition,
								targetPosition,
								easedT
							);

							dice.diceMesh.quaternion.slerp(targetQuaternion, easedT);

							if (t < 1 && dice.animation) {
								// Agregamos `dice.animation` como condición para continuar
								requestAnimationFrame(animateLerp);
							} else {
								dice.animation = false;
								// Aquí se ejecutaría la lógica para "desbloquear" el dado o finalizar su estado de rodar.
							}
						};
						requestAnimationFrame(animateLerp);
					}
				}
				dice.corr = null;
			}
		}
		const diceArray = Array.from(this.dices.values());

		for (let i = 0; i < diceArray.length; i++) {
			const diceA = diceArray[i];
			const bodyA = diceA.diceBody;
			if (diceA.isLocked) continue;

			for (let j = i + 1; j < diceArray.length; j++) {
				const diceB = diceArray[j];
				const bodyB = diceB.diceBody;

				const dist = bodyA.position.distanceTo(bodyB.position);
				const minDist = (diceA.size + diceB.size) * 0.7;

				/* if (dist < minDist) {
					console.log("Collision detected between dice A and B");

					const dir = new CANNON.Vec3()
						.copy(bodyA.position)
						.vsub(bodyB.position);
					dir.normalize();

					const impulseMagnitude = 30;

					// Impulso con componente hacia arriba agregada
					const impulse = new CANNON.Vec3(
						dir.x * impulseMagnitude,
						impulseMagnitude, // impulso hacia arriba (ajustable)
						dir.z * impulseMagnitude
					);

					// Solo mover el dado con mayor altura (eje Y)
					const higherBody =
						bodyA.position.y > bodyB.position.y ? bodyA : bodyB;

					higherBody.wakeUp();
					higherBody.applyImpulse(impulse, higherBody.position);
				} */
			}
		}

		/* 	if (rollAlDices) this.rollDice();
		 */
		this.renderer.render(this.scene, this.camera);
	}

	rotateDiceToFace(faceIndex) {
		const eulerRotations = {
			1: new CANNON.Vec3(0, 0, 0),
			2: new CANNON.Vec3(-Math.PI / 2, 0, 0),
			3: new CANNON.Vec3(0, 0, Math.PI / 2),
			4: new CANNON.Vec3(0, 0, -Math.PI / 2),
			5: new CANNON.Vec3(Math.PI / 2, 0, 0),
			6: new CANNON.Vec3(Math.PI, 0, 0),
		};

		const rot = eulerRotations[faceIndex];
		if (!rot) return;

		const quat = new CANNON.Quaternion();
		quat.setFromEuler(rot.x, rot.y, rot.z);

		this.dices[0].diceBody.quaternion.copy(quat);
		this.dices[0].diceBody.velocity.set(0, 0, 0);
		this.dices[0].diceBody.angularVelocity.set(0, 0, 0);
	}
	bindEvents() {
		/* 	this.rollBtn.onclick = () => this.rollDice();
		 */

		window.addEventListener("mousedown", (event) => this.onClick(event));
		window.addEventListener("contextmenu", (e) => e.preventDefault());
		window.addEventListener("mousemove", (event) => this.onMouseMove(event));
		/* 	window.addEventListener("keydown", (event) => {
			const num = parseInt(event.key);
			if (num >= 1 && num <= 6) {
				this.rotateDiceToFace(num);
			} else if (event.key === "ArrowLeft") {
				this.rotateDiceHorizontally("left");
			} else if (event.key === "ArrowRight") {
				this.rotateDiceHorizontally("right");
			} else if (event.key === "ArrowUp") {
				this.rotateDiceVertically("left");
			} else if (event.key === "ArrowDown") {
				this.rotateDiceVertically("right");
			}
		}); */
	}
	rotateDiceHorizontally(direction) {
		const step = Math.PI / 8; // 90 grados
		const sign = direction === "left" ? 1 : -1;

		const body = this.dices[0].diceBody; // Asume que tienes una referencia a CANNON.Body
		const mesh = this.dices[0].diceMesh; // Y también al Mesh de Three.js, por si los sincronizas

		// Aplica rotación en el eje Y
		const q = new CANNON.Quaternion();
		q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), sign * step);

		body.quaternion = body.quaternion.mult(q); // Aplica rotación al body
		mesh.quaternion.copy(body.quaternion); // Sincroniza visualmente con el mesh
	}
	rotateDiceVertically(direction) {
		const step = Math.PI / 2; // 90 grados
		const sign = direction === "left" ? 1 : -1;

		const body = this.dices[0].diceBody; // Asume que tienes una referencia a CANNON.Body
		const mesh = this.dices[0].diceMesh; // Y también al Mesh de Three.js, por si los sincronizas

		// Aplica rotación en el eje Y
		const q = new CANNON.Quaternion();
		q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), sign * step);

		body.quaternion = body.quaternion.mult(q); // Aplica rotación al body
		mesh.quaternion.copy(body.quaternion); // Sincroniza visualmente con el mesh
	}

	rollDice(dices = Array.from(this.dices.keys())) {
		for (const diceId of dices) {
			const dice = this.dices.get(diceId);

			if (dice.isLocked) continue;
			dice.isRolling = true;
			dice.diceBody.wakeUp();
			// Resetear fuerzas
			dice.diceBody.velocity.set(0, 0, 0);
			dice.diceBody.angularVelocity.set(0, 0, 0);
			dice.diceBody.force.set(0, 0, 0);
			dice.diceBody.torque.set(0, 0, 0);

			// Posicionar ligeramente elevado
			dice.diceBody.position.y = 1;

			dice.diceBody.velocity.set(0, this.prop[1], 0);
			const angularVelocityRandom = [randomSpin(), randomSpin(), randomSpin()];

			dice.diceBody.angularVelocity.set(...angularVelocityRandom);
			dice.rollIndex++;
			dice.animate = false;
		}
	}

	onClick(event) {
		if (this.isRolling || this.isLocked) return;
		const rect = this.renderer.domElement.getBoundingClientRect();

		const mouse = new THREE.Vector2(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1
		);

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, this.camera);

		const diceMeshes = Array.from(this.dices.values()).map(
			(diceInstance) => diceInstance.diceMesh
		);

		const intersects = raycaster.intersectObjects(diceMeshes, true);

		if (intersects.length > 0) {
			// El primer elemento de intersects es el objeto más cercano que el rayo intersectó
			const clickedMesh = intersects[0].object;

			const selectedDiceInstance = Array.from(this.dices.values()).find(
				(diceInstance) => diceInstance.diceMesh === clickedMesh
			);
			if (event.button === 2) {
			} else if (
				selectedDiceInstance &&
				!selectedDiceInstance.isLocked &&
				!selectedDiceInstance.isRolling
			) {
				this.clickDiceCallback(
					selectedDiceInstance.id,
					this.lockDice.bind(this),
					this.dices
				);
			}
		}
	}

	onMouseMove(event) {
		const mouse = new THREE.Vector2(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, this.camera);

		const diceMeshes = Array.from(this.dices.values()).map(
			(diceInstance) => diceInstance.diceMesh
		);

		const intersects = raycaster.intersectObjects(diceMeshes, true);

		if (intersects.length > 0) {
			const hoveredMesh = intersects[0].object;

			const hoveredDice = Array.from(this.dices.values()).find(
				(diceInstance) => diceInstance.diceMesh === hoveredMesh
			);

			if (hoveredDice && !hoveredDice.isLocked) {
				if (this.hovering) {
					this.hovering(1);
				}
			} else {
				if (this.hovering) {
					this.hovering(0);
				}
			}
		} else {
			if (this.hovering) {
				this.hovering(0);
			}
		}
	}

	lockDice(diceId, face, instant = false) {
		const diceInstance = this.dices.get(diceId);
		diceInstance.diceBody.quaternion.normalize();

		diceInstance.isLocked = true;
		diceInstance.isRolling = false;
		diceInstance.diceBody.velocity.setZero();
		diceInstance.diceBody.angularVelocity.setZero();
		diceInstance.diceBody.type = CANNON.Body.KINEMATIC;
		diceInstance.diceBody.sleep();
		diceInstance.diceBody.collisionResponse = false;

		diceInstance.faceSelected = face;
		this.moveDiceToSlot(face, instant, diceId);
	}

	applyFullRemoteDiceData(dataString, type = "default") {
		let parsedData;
		try {
			parsedData = JSON.parse(dataString);
		} catch (e) {
			console.error("Failed to parse dice data:", e);
			return;
		}

		for (const remoteDice of parsedData) {
			const dice = this.dices.get(remoteDice.diceId);
			if (!dice) continue;

			if (type === "correction") {
				dice.corr = {};
				dice.corr.position = remoteDice.position;
				dice.corr.quaternion = remoteDice.quaternion;
				dice.corr.velocity = remoteDice.velocity;
				dice.corr.angularVelocity = remoteDice.angularVelocity;
				dice.corr.rollIndex = remoteDice.rollIndex;
			} else {
				if (!dice.isLocked) {
					dice.diceBody.wakeUp();
				}
				dice.isRolling = true;
				dice.animate = false;
				dice.diceBody.velocity.set(...remoteDice.velocity);
				dice.diceBody.angularVelocity.set(...remoteDice.angularVelocity);
				dice.diceBody.position.y = 1;
				dice.diceBody.quaternion.set(...remoteDice.quaternion);
				dice.rollIndex = remoteDice.rollIndex;

				if (type === "impulse") {
				}
				if (type !== "impulse") {
					dice.diceBody.position.set(...remoteDice.position);
				}
			}
		}
	}

	getQuaternionLookAtCamera(face) {
		const faceUpLocals = [
			new THREE.Vector3(0, 1, 0), // +X (Derecha) - su "arriba" es el eje Y
			new THREE.Vector3(0, 1, 0), // -X (Izquierda) - su "arriba" es el eje Y
			new THREE.Vector3(0, 0, -1), // +Y (Superior) - su "arriba" es el eje -Z del cubo
			new THREE.Vector3(0, 0, 1), // -Y (Inferior) - su "arriba" es el eje +Z del cubo
			new THREE.Vector3(0, 1, 0), // +Z (Frontal) - su "arriba" es el eje Y
			new THREE.Vector3(0, 1, 0), // -Z (Trasera) - su "arriba" es el eje Y
		];

		const cameraLookDirection = new THREE.Vector3();
		this.camera.getWorldDirection(cameraLookDirection);

		const targetCubeFaceNormalLocal = this.faceNormals[face - 1].clone();
		const desiredCubeFaceNormalGlobal = cameraLookDirection.negate();

		const rotationQuaternion = new THREE.Quaternion();
		rotationQuaternion.setFromUnitVectors(
			targetCubeFaceNormalLocal,
			desiredCubeFaceNormalGlobal
		);

		// --- Start: Logic to align the "up" vector ---

		// 1. Camera's global "up" direction (assuming world Y is up)
		const cameraUpGlobal = new THREE.Vector3(0, 1, 0);

		// 2. Local "up" vector for the selected face
		const targetCubeFaceUpLocal = faceUpLocals[face - 1].clone();

		// 3. Apply the initial rotation to the face's local "up" to see where it ends up globally
		let currentCubeFaceUpGlobal = targetCubeFaceUpLocal
			.clone()
			.applyQuaternion(rotationQuaternion);

		// 4. Project the desired "up" onto the plane perpendicular to the face normal
		// This prevents unwanted roll if the camera's up is not perfectly perpendicular to the face normal
		const desiredUpProjected = cameraUpGlobal
			.clone()
			.projectOnPlane(desiredCubeFaceNormalGlobal)
			.normalize();

		// 5. Calculate the additional rotation needed to align the "up" vectors
		const alignUpQuaternion = new THREE.Quaternion();
		alignUpQuaternion.setFromUnitVectors(
			currentCubeFaceUpGlobal,
			desiredUpProjected
		);

		// 6. Combine the rotations: apply the "up" alignment first, then the normal alignment
		rotationQuaternion.premultiply(alignUpQuaternion);

		// --- End: Logic to align the "up" vector ---

		return rotationQuaternion;
	}

	unlockDice(diceId, realocated = false) {
		const dice = this.dices.get(diceId);
		dice.isRolling = true;

		const canvas = document.querySelector("#scene-container canvas");
		const rect = canvas.getBoundingClientRect();

		const screenX = dice.targetX;
		const screenY = dice.targetY;

		// Normaliza usando los bordes reales del canvas
		const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
		const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

		// Ahora usás esos valores
		let vector = new THREE.Vector3(ndcX, ndcY, 0);
		vector.unproject(this.camera);

		// Encontrar una posición libre
		if (realocated) {
			const freePosition = this.findFreePosition(diceId);

			dice.diceBody.position.set(
				freePosition.x,
				freePosition.y,
				freePosition.z
			);
		}
		let targetPosition = dice.diceBody.position.clone();
		dice.diceMesh.position.set(vector.x, vector.y, vector.z);

		const startScale = dice.diceMesh.scale.x; // Escala actual
		const endScale = dice.size;
		// Posición actual
		const startPos = vector.clone();
		const endPos = targetPosition.clone();
		const duration = 300; // milisegundos
		let startTime = null;
		const cannonQuat = dice.diceBody.quaternion;

		// Create a new THREE.Quaternion and copy the values from the Cannon.js quaternion
		const endQuat = new THREE.Quaternion(
			cannonQuat.x,
			cannonQuat.y,
			cannonQuat.z,
			cannonQuat.w
		);
		const animate = (time) => {
			if (!startTime) startTime = time;
			const elapsed = time - startTime;
			const t = Math.min(elapsed / duration, 1);

			function easeOutSine(x) {
				return Math.sin((x * Math.PI) / 2);
			}
			const easeT = easeOutSine(t);
			// Interpolación lineal
			const x = startPos.x + (endPos.x - startPos.x) * easeT;
			const y = startPos.y + (endPos.y - startPos.y) * easeT;
			const z = startPos.z + (endPos.z - startPos.z) * easeT;

			dice.diceMesh.position.set(x, y, z);
			dice.diceMesh.quaternion.slerp(endQuat, easeT);
			const newScale = startScale + (endScale - startScale) * easeT;
			dice.diceMesh.scale.set(newScale, newScale, newScale);

			if (t < 1) {
				requestAnimationFrame(animate);
			} else {
				dice.diceBody.collisionResponse = true;
				dice.diceBody.velocity.setZero();
				dice.diceBody.angularVelocity.setZero();
				dice.diceBody.type = CANNON.Body.DYNAMIC;
				dice.diceBody.wakeUp();
				dice.isLocked = false;
				dice.isRolling = false;

				this.onUnlocked(diceId);
			}
		};

		requestAnimationFrame(animate);
	}

	// Función para encontrar una posición libre
	findFreePosition(currentId) {
		const size = this.dices.get(currentId).size;
		const margin = 0.1;
		const radius = (Math.sqrt(2) * size) / 2 + margin;
		let position;
		let maxTries = 100;
		let tries = 0;

		do {
			position = new CANNON.Vec3(
				(Math.random() - 0.5) * 6,
				0.4,
				(Math.random() - 0.5) * 6
			);

			let collision = false;
			for (const [id, other] of this.dices) {
				if (id === currentId) continue;

				const dist = position.distanceTo(other.diceBody.position);
				if (!other.isLocked && dist < radius) {
					collision = true;
					break;
				}
			}

			if (!collision) break;
			tries++;
		} while (tries < maxTries);

		return position;
	}
	moveDiceToSlot(face, instant = false, diceId) {
		const diceInstance = this.dices.get(diceId);
		const start = diceInstance.diceMesh.position.clone();
		const canvas = document.querySelector("#scene-container canvas");
		const rect = canvas.getBoundingClientRect();

		const screenX = diceInstance.targetX;
		const screenY = diceInstance.targetY;

		// Normaliza usando los bordes reales del canvas
		const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
		const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

		// Ahora usás esos valores
		let vector = new THREE.Vector3(ndcX, ndcY, 0);

		vector.unproject(this.camera);
		let startTime = null; // lo inicializamos en null
		const duration = 500; // Duración de la animación en milisegundos
		const quat = this.getQuaternionLookAtCamera(face);
		if (instant) {
			diceInstance.diceMesh.position.copy(vector);
			diceInstance.diceMesh.quaternion.copy(quat);
			diceInstance.diceMesh.scale.set(
				diceInstance.lockedSize,
				diceInstance.lockedSize,
				diceInstance.lockedSize
			);
			if (this.onLocked)
				this.onLocked(face, diceId, this.unlockDice.bind(this));

			return; // Termina la función aquí para evitar la animación
		}

		const animateLerp = (now) => {
			if (!startTime) startTime = now; // Asignamos startTime en la primera llamada
			const elapsed = now - startTime;
			const t = Math.min(elapsed / duration, 1);
			function easeOutCubic(t) {
				return 1 - Math.pow(1 - t, 3);
			}
			function easeOutQuad(x) {
				return 1 - (1 - x) * (1 - x);
			}
			function easeOutQuart(t) {
				return 1 - Math.pow(1 - t, 4);
			}
			function easeOutSine(x) {
				return Math.sin((x * Math.PI) / 2);
			}

			const easedT = easeOutSine(t); // Por ejemplo

			diceInstance.diceMesh.position.lerpVectors(start, vector, easedT);

			diceInstance.diceMesh.quaternion.slerp(quat, easedT);

			const currentScale = diceInstance.diceMesh.scale.x; // Asumo escala uniforme
			const targetScale = diceInstance.lockedSize;

			const newScale = currentScale + (targetScale - currentScale) * easedT;
			diceInstance.diceMesh.scale.set(newScale, newScale, newScale);
			if (t < 1) {
				requestAnimationFrame(animateLerp);
			} else {
				if (this.onLocked)
					this.onLocked(face, diceId, this.unlockDice.bind(this));
			}
		};

		requestAnimationFrame(animateLerp);
	}
	setOnUnlocked(callback) {
		this.onUnlocked = callback;
	}
}

class Dice {
	constructor(
		scene,
		world,
		size = 1,
		initialPosition = new THREE.Vector3(0, 0, 0),
		materials = {},
		lockedSize = 1,
		targetX = 0,
		targetY = 0
	) {
		this.id = nextDiceId++;
		this.scene = scene;
		this.world = world; // El mundo físico de Cannon-ES
		this.size = size;
		this.isRolling = false;
		this.isLocked = false;
		// 1. Geometría (ejemplo: BoxGeometry para un d6)
		// Podrías tener una geometría más compleja para dados con caras redondeadas o números.
		const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
		this.targetX = targetX;
		this.targetY = targetY;
		// 2. Material (ejemplo: MeshStandardMaterial)
		this.faceSelected = 1; // cara seleccionada por defecto
		// 3. Malla de Three.js (la representación visual)
		this.diceMesh = new THREE.Mesh(geometry, materials);
		this.diceMesh.position.copy(initialPosition);
		this.scene.add(this.diceMesh);
		this.corr = null;
		// 4. (Opcional) Cuerpo físico de Cannon-ES
		// Si estás integrando física, necesitas un cuerpo rígido asociado a la malla.
		const shape = new CANNON.Box(
			new CANNON.Vec3(this.size / 2, this.size / 2, this.size / 2)
		);
		this.diceBody = new CANNON.Body({
			mass: 50, // Masa del dado
			shape: shape,
			position: new CANNON.Vec3(
				initialPosition.x,
				initialPosition.y,
				initialPosition.z
			),
			material: new CANNON.Material(), // Puedes definir un material físico
		});
		this.world.addBody(this.diceBody);
		this.disablePhysics;
		this.animation = false;
		this.rollIndex = 0;
		this.lockedSize = lockedSize; // Tamaño del dado cuando está bloqueado
		// Asegúrate de sincronizar la malla con el cuerpo físico en el bucle de animación
	}

	// Método para actualizar la posición y rotación del dado a partir del cuerpo físico
	update() {
		if (!this.isLocked && !this.animation) {
			this.diceMesh.position.copy(this.diceBody.position);
			this.diceMesh.quaternion.copy(this.diceBody.quaternion);
		}
	}

	getTopFace() {
		const up = new THREE.Vector3(0, 1, 0);
		const diceMesh = this.diceMesh;
		const worldQuat = diceMesh.getWorldQuaternion(new THREE.Quaternion());
		let maxDot = -Infinity;
		let topFace = 1;

		for (let i = 0; i < faceNormals.length; i++) {
			const localNormal = faceNormals[i].clone().applyQuaternion(worldQuat);
			const dot = localNormal.dot(up);
			if (dot > maxDot) {
				maxDot = dot;
				topFace = i + 1;
			}
		}

		return topFace;
	}
}
