const months = [
    "Wisdom",
    "Temperance",
    "Beauty",
    "Lightness",
    "Diligence",
    "Humility",
    "Kindness",
    "Playfulness",
    "Truth",
    "Love",
    "Fortitude",
    "Courage",
    "Mercy"
];

const gregorian_leap_year = gregorian_year => {
    if (gregorian_year%4 == 0) {
        if (gregorian_year%100 == 0) {
            if (gregorian_year%400 == 0) {
                return true;
            }
            return false;
        }
        return true;
    }
    return false;
}
const sophia_leap_year = sophia_year => {
    let leap_years = [4, 8, 12, 16, 20, 24];
    return leap_years.includes(sophia_year);
}
const days_to_ymd = days_since_sophia => {
    if (days_since_sophia < 0) {
        throw "needs to be positive! no B.S.";
    }

    let day_in_year = days_since_sophia;
    let year = 0;
    while (day_in_year >= (365+sophia_leap_year(year))) {
        day_in_year -= 365;
        day_in_year -= sophia_leap_year(year);
        year += 1;
    }

    let month = "";
    let day_in_month = 0;
    let year_string = `year ${year} of <span class="name">Sophia</span>`
    if (day_in_year == 0) {
        return "Sophia day of " + year_string;
    } else if (sophia_leap_year(year) && (day_in_year >= (6*28+1))) {
        if (day_in_year == (6*28+1)) {
            return "Leap day of " + year_string;
        } else {
            month = months[Math.floor((day_in_year-2)/28)];
            day_in_month = (day_in_year-2)%28
        }
    } else {
        month = months[Math.floor((day_in_year-1)/28)];
        day_in_month = (day_in_year-1)%28;
    }
    const day = day_in_month+1;
    const day_ordinal = ((day%10) == 1) ? "st" : ((day%10) == 2) ? "nd" : ((day%10) == 3) ? "rd" : "th";
    const year_ordinal = ((year%10) == 1) ? "st" : ((year%10) == 2) ? "nd" : ((year%10) == 3) ? "rd" : "th";

    return `the ${day}${day_ordinal} day of the month of ${month} in the ${year}${year_ordinal} year of <span class="name">Sophia</span>`;
}

const gregorian_date = new Date();
const sophia_day = new Date(1999, 9, 7);
const diff_in_days = Math.floor((gregorian_date - sophia_day)/1000/86400);

let days = document.getElementById("days");
days.innerHTML = `Is is currently ${days_to_ymd(diff_in_days)}.`