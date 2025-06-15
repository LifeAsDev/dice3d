function lockDice(index, lockDiceCallback, dices) {
	if (runtime.globalVars.diceMainUIOpen) return;
	const newDiceindex = getFirstAvailableSlot(dicesLocked);

	const face = dices[index].getTopFace();

	dicesLocked[newDiceindex] = { index, face };

	dices[index].targetX = dicesSlotPositions[0][newDiceindex].x;
	dices[index].targetY = dicesSlotPositions[0][newDiceindex].y;
	lockDiceCallback(index, face);
	runtime.callFunction("addLockDice");
}

const onFinishTransition = (face, index, unlockDiceCallBack) => {
	const slotIndex = dicesLocked.findIndex((slot) => slot.index === index);

	dice.dices[index].diceMesh.visible = false;

	runtime.callFunction("setLockDice", face, slotIndex, index);

	dicesLocked[slotIndex].unlock = () =>
		unlockDice(index, unlockDiceCallBack, slotIndex);
};
