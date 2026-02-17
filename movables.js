//
// NAMES
//
let mouse_interval = null;
let names = ["Sophia", "Chrysanthemum", "Fork", "$DEADNAME", "cis_female", "computergorl", "the_great_magician", "girl.surgery", "me", "Sophirot", "Ein Sof", "Big Soph", "🍴🥬🧠", "stoggily", "sophiawisdom"];
let mouseover = e => {
    let idx = Math.floor(Math.random()*names.length);
    Array.from(document.getElementsByClassName("name")).forEach(n => n.textContent = names[idx]);
    clearInterval(mouse_interval);
    mouse_interval = setInterval(mouseover, 15000);
    Array.from(document.getElementsByClassName("email")).forEach(mail => {
        mail.href = `mailto:${names[idx]}@girl.surgery`;
    });
}

Array.from(document.getElementsByClassName("email")).forEach(mail => {
    mail.href = `mailto:sophia@girl.surgery`;
});

Array.from(document.getElementsByClassName("name")).forEach(n => n.onmouseover = mouseover);
mouse_interval = setInterval(mouseover, 30000);

function interpolateColors(colors, fraction) {
    let labs = colors.map(rgb => rgbToLab(rgb));
    let resultLab = [
        labs[0][0] * (1-fraction) + labs[1][0] * fraction,
        labs[0][1] * (1-fraction) + labs[1][1] * fraction,
        labs[0][2] * (1-fraction) + labs[1][2] * fraction
];

    return labToRgb(resultLab);
}
