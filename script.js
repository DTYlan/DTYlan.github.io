window.onload = function(){
	console.log("Ready");
};

const inputs = [
	{ element: document.querySelector("#curAlt"), label: "Current Altitude" },
	{ element: document.querySelector("#tarAlt"), label: "Target Altitude" },
	{ element: document.querySelector("#tarRate"), label: "Target Descent Path" },
	{ element: document.querySelector("#spd"), label: "Indicated Airspeed" },
	{ element: document.querySelector("#spdAtAlt"), label: "Speed Constraint" },
	{ element: document.querySelector("#spdAlt"), label: "Altitude Constraint" }
];

const output = document.querySelector("#result");

function resetInput(values){
	inputs.forEach(({ element }) => {
		if (values) {
			element.value = "";
		}
		element.removeAttribute("aria-invalid");
		element.removeAttribute("aria-describedby");
	});
	document.querySelectorAll("small").forEach(e => e.remove());
	output.innerHTML = "";
}

//	Returns [currentAlt, targetAlt, targetRate, ...] if pass, else returns null
function validateInput(){
	const errors = [];
	
	const values = inputs.map(({ element, label }) => {
		const rawValue = element.value.trim();
		
		//	Check if empty
		if (rawValue === "") {
			errors.push([element.getAttribute("id"), `${label} can't be empty.`]);
			return null;
		}
		
		const value = Number(rawValue);
		
		/* Redundant if browser forces number
		//	Check if number is real
		if (!Number.isFinite(value)) {
			errors.push(`${label} must be a vaild number.`);
			return null;
		}*/
		
		return value;
	}); 
	
	const [currentAlt, targetAlt, targetRate, speed, speedAtAlt, speedAlt] = values;
	
	//	Check Current alt is greater than Target
	if (
		currentAlt !== null &&
		targetAlt !== null &&
		currentAlt <= targetAlt
	) {
		errors.push(["curAlt", "Current Altitude must be higher than Target Altitude."]);
	}
	
	//	Check target rate
	if (
		targetRate !== null &&
		targetRate < 0.1 ||
		targetRate > 10
	) {
		errors.push(["tarRate", "Target Descent Path must be between 0.1 and 10."]);
	}
	
	//	Check speed is less than IAS
	if (
		speed !== null &&
		speedAtAlt !== null &&
		speedAtAlt > speed
	) {
		errors.push(["spdAtAlt", "Speed Constraint must be slower than Indicated Airspeed."]);
	}
	
	//	Check if spdAlt is between Cruise and Target
	if (
		currentAlt !== null &&
		targetAlt !== null &&
		speedAlt !== null &&
		speedAlt > currentAlt ||
		speedAlt < targetAlt 
	) {
		errors.push(["spdAlt", "Altitude Constraint must be between " + currentAlt + "ft and " + targetAlt + "ft."]);
	}
	
	//	Check an output errors
	if (errors.length > 0) {
		errors.forEach(( error ) => {
			const input = document.querySelector(`#${error[0]}`);
			// Insert helper
			const helper = document.createElement("small");
			helper.setAttribute("id", `${error[0]}-helper`);
			helper.innerText = error[1];
			input.parentNode.parentNode.appendChild(helper);
			// Insert aria
			input.setAttribute("aria-invalid", "true");
			input.setAttribute("aria-describedby", `${error[0]}-helper`);
		});
		return null;
	}
	
	output.innerHTML = "";
	return values;
}

function calDis(upperAlt, lowerAlt, rate) {
	//	Rounded to nearest 0.1 nm
	return Math.round(((upperAlt - lowerAlt) / rate) * 10) / 10;
}

function calDes() {
	resetInput(false);
	const values = validateInput();
	
	if (values === null) return;
	
	const [currentAlt, targetAlt, targetRate, speed, speedAtAlt, speedAlt] = values;
	let dist = 0;
	
	//	Get ft per nm
	const rate = Math.round(6076.12 * Math.tan((targetRate * Math.PI) / 180));
	
	if (speed != speedAtAlt) {
		const buffer = (speed - speedAtAlt) / 10;
		dist = ((calDis(currentAlt, speedAlt, rate) + calDis(speedAlt, targetAlt, rate)) + buffer).toFixed(1);
		output.innerHTML = `<br><p>Begin descent <strong>${dist} nm</strong> to target.<br>Level at <strong>${speedAlt} ft</strong> to reduce to <strong>${speedAtAlt} kts</strong> for <strong>${buffer} nm</strong>.</p>`;
	} else {
		//	Workout distance
		dist = calDis(currentAlt, targetAlt, rate);
		output.innerHTML = `<br><p>Begin descent <strong>${dist} nm</strong> to target.</p>`;
	}
}