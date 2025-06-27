function lockDice(index, lockDiceCallback, dices) {
	if (runtime.globalVars.diceMainUIOpen) return;
	const ownerId = dicesOwner[index];

	const newDiceindex = getFirstAvailableSlot(dicesSlotPositions[ownerId]);

	const face = dices[index].getTopFace();

	dicesSlotPositions[ownerId][newDiceindex].slot = index;
	dices[index].targetX = dicesSlotPositions[ownerId][newDiceindex].x;
	dices[index].targetY = dicesSlotPositions[ownerId][newDiceindex].y;
	lockDiceCallback(index, face);
	runtime.callFunction("addLockDice");
}

const onFinishTransition = (face, index, unlockDiceCallBack) => {
	const ownerId = dicesOwner[index];

	const slotIndex = dicesSlotPositions[ownerId].findIndex((diceSlot) => {
		console.log(diceSlot);
		return diceSlot.slot === index;
	});

	dice.dices[index].diceMesh.visible = false;

	runtime.callFunction("setLockDice", face, slotIndex, index, ownerId);

	dicesSlotPositions[ownerId][slotIndex].unlock = () =>
		unlockDice(index, unlockDiceCallBack, slotIndex);
};

const data = dice.dices
	.map((dice, index) => ({ dice, index }))
	.filter(({ dice }) => !dice.isLocked)
	.map((dice, index) => {
		return {
			index,
			position: [
				dice.diceBody.position.x,
				dice.diceBody.position.y,
				dice.diceBody.position.z,
			],
			quaternion: [
				dice.diceBody.quaternion.x,
				dice.diceBody.quaternion.y,
				dice.diceBody.quaternion.z,
				dice.diceBody.quaternion.w,
			],
		};
	});

localVars.stringifyDiceData = JSON.stringify(data);
for (i = 0; i < dicesOwner.length; i++) {
	const previousID = localVars.previousID;
	if (dicesOwner[i] === previousID) dicesOwner[i] = localVars.peerID;
}

dice.dices
	.filter(
		(dice, index) => !dice.isRolling || localVars.id === dicesOwner[index]
	)
	.map((dice, index) => ({
		index,
		position: [
			dice.diceBody.position.x,
			dice.diceBody.position.y,
			dice.diceBody.position.z,
		],
		velocity: [
			dice.diceBody.velocity.x,
			dice.diceBody.velocity.y,
			dice.diceBody.velocity.z,
		],
		angularVelocity: [
			dice.diceBody.angularVelocity.x,
			dice.diceBody.angularVelocity.y,
			dice.diceBody.angularVelocity.z,
		],
		quaternion: [
			dice.diceBody.quaternion.x,
			dice.diceBody.quaternion.y,
			dice.diceBody.quaternion.z,
			dice.diceBody.quaternion.w,
		],
	}));

localVars.stringifyDiceData = JSON.stringify(data);

let parsedData;
try {
	parsedData = JSON.parse(dataString);
} catch (e) {
	console.error("Failed to parse dice data:", e);
	return;
}

function vectorLength(vec) {
	const [x, y, z] = vec;
	return Math.sqrt(x * x + y * y + z * z);
}

localVars.dicesRollCount = 0;
let i = 0;
for (const remoteDice of parsedData) {
	const linearVel = vectorLength(remoteDice.velocity);
	const angularVel = vectorLength(remoteDice.angularVelocity);

	if (
		(linearVel > dice.velocityThreshold ||
			angularVel > dice.angularVelocityThreshold) &&
		dicesOwner[index] === runtime.globalVars.myID
	) {
		localVars.dicesRollCount++;
	}
	i++;
}

function axialToWorldPointy({ q, r }, size) {
	let x = Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r;
	let y = (3 / 2) * r;

	x = x * size;
	y = y * size;
	return { x, y };
}
