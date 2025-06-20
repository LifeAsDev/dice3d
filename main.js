import DiceScene from "./src/DiceScene.js";
const slot = document.getElementById("characterSlots"); // o "#character-slot" si es un id

const rect = slot.getBoundingClientRect();
/* const diceSprite = document.querySelector("#dice-sprite"); // o "#dice-sprite" si es un id
diceSprite.onclick = () => this.unlockDice();
 */
// Coordenadas del centro
const centerX = rect.left + 52;
const centerY = rect.top + rect.height / 2;
const dicesLocked = [null, null, null];
const rollBtn = document.getElementById("rollBtn");

function lockDice(index, lockDiceCallback, dices) {
	const newDiceindex = getFirstAvailableSlot(dicesLocked);
	const face = dices[index].getTopFace();
	dicesLocked[newDiceindex] = { index, face };

	dices[index].targetX = newDiceindex * 114 + centerX;
	dices[index].targetY = centerY;
	lockDiceCallback(index, face);
}
const unlockDice = (index, unlockDiceCallBack, slotIndex) => {
	const diceSprite = document.getElementById(`dice-sprite${slotIndex + 1}`);
	dicesLocked[slotIndex] = null;
	diceSprite.style.display = "none";
	unlockDiceCallBack(index);
};

const onFinishTransition = (face, index, unlockDiceCallBack) => {
	const slotIndex = dicesLocked.findIndex((slot) => slot.index === index);
	const diceSprite = document.getElementById(`dice-sprite${slotIndex + 1}`);
	diceSprite.src = `/dice${face}.png`;
	diceSprite.classList.remove("hide");
	diceSprite.classList.add("show");
	diceSprite.style.display = "block";
	diceSprite.style.opacity = 0.9;
	diceSprite.onclick = () => unlockDice(index, unlockDiceCallBack, slotIndex);
};

const dice = new DiceScene(lockDice, onFinishTransition, undefined, true);
rollBtn.onclick = () => {
	dice.rollDice();
};

function getFirstAvailableSlot(dicesLockedSlots) {
	let availableSlotIndex = -1;
	for (let i = 0; i < 3; i++) {
		if (dicesLockedSlots[i] === null) {
			// Si el slot en este índice está vacío
			availableSlotIndex = i;
			break; // Salir del bucle, encontramos el primero
		}
	}
	return availableSlotIndex;
}

dice.initDice(0.9);
dice.initDice(0.9);
dice.initDice(0.9);
dice.initDice(0.9);
