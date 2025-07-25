lockDice = (diceId, lockDiceCallback, dices) => {
	const diceInstance = dices.get(diceId);
	const ownerId = dice.ownerId;

	if (
		(runtime.globalVars.diceMainOpenID != "" ||
			runtime.globalVars.myID != ownerId) &&
		runtime.globalVars.initialImpulse === 2
	)
		return;

	const slotIndexAvailable = getFirstAvailableSlot(dicesSlotPositions[ownerId]);

	const face = diceInstance.getTopFace();

	dicesSlotPositions[ownerId][slotIndexAvailable].slot = diceId;

	diceInstance.targetX = dicesSlotPositions[ownerId][slotIndexAvailable].x;
	diceInstance.targetY = dicesSlotPositions[ownerId][slotIndexAvailable].y;

	dicesSlotPositions[ownerId][slotIndexAvailable].unlock = (
		realocated = false
	) => unlockDice(diceId, slotIndexAvailable, realocated);

	lockDiceCallback(diceId, face);
	runtime.callFunction("addLockDice", diceId, ownerId, face);
};

dice = new DiceScene(lockDice);

const onLocked = (face, diceId) => {
	const diceInstance = dice.dices.get(diceId);
	const ownerId = dice.ownerId;

	if (!diceInstance.isRolling) diceInstance.diceMesh.visible = false;

	const slotIndex = dicesSlotPositions[ownerId].findIndex((diceSlot) => {
		return diceSlot.slot === diceId;
	});

	runtime.callFunction("setLockDice", face, slotIndex, diceId, ownerId);
};

dice.onLocked = (face, diceId) => {
	onLocked(face, diceId);
};

const sceneContainer = document.getElementById("scene-container");

sceneContainer.style.pointerEvents = "none";

const onUnlocked = (diceId) => {
	const diceInstance = dice.dices.get(diceId);
	const ownerId = dice.ownerId;

	diceInstance.diceMesh.visible = true;
	runtime.callFunction("onUnlocked", diceId);
};

dice.setOnUnlocked(onUnlocked);
dice.onRollEnd = (diceId, face) => {
	runtime.callFunction("onRollEnd", diceId, face);
};
dice.hovering = (hovering) => {
	runtime.globalVars.hoveringDice = hovering;
};
