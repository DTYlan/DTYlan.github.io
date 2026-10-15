const inputs = [
	{ element: document.querySelector("#curAlt"), label: "Current Altitude", required: true },
	{ element: document.querySelector("#tarAlt"), label: "Target Altitude", required: true },
	{ element: document.querySelector("#tarRate"), label: "Target Descent Path", required: true },
	{ element: document.querySelector("#spd"), label: "Indicated Airspeed", required: false },
	{ element: document.querySelector("#spdAtAlt"), label: "Speed Constraint", required: false },
	{ element: document.querySelector("#spdAlt"), label: "Altitude Constraint", required: false }
];

const output = document.querySelector("#result");

document.querySelector("#calBtn").addEventListener("click", calTod);
document.querySelector("#rstBtn").addEventListener("click", () => { resetInput(true) });

function resetInput(values){
	inputs.forEach(({ element }) => {
		if (values) {
			element.value = "";
		}
		
		//	Remove helper
		const helper = document.querySelector(`#${element.getAttribute('id')}-helper`);
		if (helper !== null) {
			helper.remove();
		}
		element.removeAttribute("aria-invalid");
		element.removeAttribute("aria-describedby");
	});
	output.innerHTML = "";
}

//	Returns [currentAlt, targetAlt, targetRate, ...] if pass, else returns null
function validateInput(){
	const invalidInput = inputs.find(
        ({ element }) => !element.checkValidity()
    );

    if (invalidInput) {
        invalidInput.element.reportValidity();
        return null;
    }
	
	const errors = [];
	
	const values = inputs.map(({ element, label, required }) => {
		const rawValue = element.value.trim();
		
		//	Check if empty
		if (rawValue === "") {
			if (required) {
				errors.push([element.getAttribute("id"), `${label} can't be empty.`]);
			}
			return null;
		}
		
		const value = Number(rawValue);
		return value;
	}); 
	
	const [currentAlt, targetAlt, targetRate, speed, speedAtAlt, speedAlt] = values;
	
	//	Check optional speed constraints
	const optionalInputs = inputs.some(({ element, required }) => !required && element.value.trim() !== "");
	
	if (optionalInputs) {
		inputs.forEach(({ element, label, required }, index) => {
			if (!required && values[index] === null) {
				errors.push([element.getAttribute('id'), `${label} is required when using a speed constraint.`]);
			}
		});
	}
	
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
		( targetRate < 0.1 || targetRate > 10 )
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
		( speedAlt > currentAlt || speedAlt < targetAlt )
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

function calDes(upperAlt, lowerAlt, deg) {
	const grad = 6076.12 * Math.tan(deg * Math.PI / 180);	//	Get ft per nm
	const dist = (upperAlt - lowerAlt) / grad;
	return {
		gradient: grad,
		distance: dist
	};
}

function calTod() {
	resetInput(false);
	const values = validateInput();
	
	if (values === null) return;
	
	const [currentAlt, targetAlt, targetRate, speed, speedAtAlt, speedAlt] = values;
	let dist = 0;
	
	if (speed != speedAtAlt) {
		const buffer = (speed - speedAtAlt) / 10;
		dist = (calDes(currentAlt, speedAlt, targetRate).distance + calDes(speedAlt, targetAlt, targetRate).distance) + buffer;
		output.innerHTML = `<br><p>Begin descent <strong>${dist.toFixed(1)} nm</strong> to target.<br>Level at <strong>${speedAlt} ft</strong> to reduce to <strong>${speedAtAlt} kts</strong> for <strong>${buffer} nm</strong>.</p>`;
	} else {
		//	Workout distance
		dist = calDes(currentAlt, targetAlt, targetRate).distance;
		output.innerHTML = `<br><p>Begin descent <strong>${dist.toFixed(1)} nm</strong> to target.</p>`;
	}
}
