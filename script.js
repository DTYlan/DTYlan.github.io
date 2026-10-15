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
			element.value = element.defaultValue;
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
		speedAtAlt >= speed
	) {
		errors.push(["spdAtAlt", "Speed Constraint must be slower than Indicated Airspeed."]);
	}
	
	//	Check if spdAlt is between Cruise and Target
	if (
		currentAlt !== null &&
		targetAlt !== null &&
		speedAlt !== null &&
		( speedAlt >= currentAlt || speedAlt <= targetAlt )
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

function displayResult(data) {
	const template = document.querySelector("#resultTemplate");
	const fragment = template.content.cloneNode(true);
	
	const setText = (field, value) => {
		fragment.querySelector(`[data-field="${field}"]`).textContent = value;
	};
	
	setText("distance", data.distance.toFixed(1));
	setText("currentAlt", data.currentAlt);
	setText("targetAlt", data.targetAlt);
	setText("angle", data.angle);
	setText("gradient", data.gradient.toFixed(0));
	setText("distanceNote", data.constraint ? "Includes additional distance allowance for the speed constraint." : "Based on the selected descent angle.");

	const constraintSection = fragment.querySelector('[data-section="constraint"]');

	if (data.constraint) {
		setText("speedAlt", data.speedAlt);
		setText("speed", data.speedAtAlt);
		setText("buffer", data.buffer.toFixed(1));
		constraintSection.hidden = false;
	}

	output.replaceChildren(fragment);
}

function calTod() {
	resetInput(false);
	const values = validateInput();
	
	if (values === null) return;
	
	const [currentAlt, targetAlt, targetRate, speed, speedAtAlt, speedAlt] = values;
	
	if (
		speed !== null &&
		speedAtAlt !== null &&
		speedAlt !== null
	) {
		const buffer = (speed - speedAtAlt) / 10;
		const upperResult = calDes(currentAlt, speedAlt, targetRate);
		const lowerResult = calDes(speedAlt, targetAlt, targetRate);
		const result = {
			gradient: upperResult.gradient,
			distance: upperResult.distance + lowerResult.distance + buffer
		 };
		
		displayResult({
			distance: result.distance,
			currentAlt,
			targetAlt,
			angle: targetRate,
			gradient: result.gradient,
			constraint: true,
			speedAlt,
			speedAtAlt,
			buffer
		});
	} else {
		const result = calDes(currentAlt, targetAlt, targetRate);
	
		displayResult({
			distance: result.distance,
			currentAlt,
			targetAlt,
			angle: targetRate,
			gradient: result.gradient,
			constraint: false
		});
	}
}
