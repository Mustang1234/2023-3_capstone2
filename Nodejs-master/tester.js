
function _year_semester() {
    const date = new Date();
    const currentMonth = date.getMonth() + 1; // 월은 0부터 시작하므로 1을 더해줍니다.
    const currentDay = date.getDate();

    if ((currentMonth === 3 && currentDay >= 1) || (currentMonth > 3 && currentMonth < 6) || (currentMonth === 6 && currentDay <= 22)) {
        return `${date.getFullYear()}-1`;
    } else if ((currentMonth === 6 && currentDay >= 23) || (currentMonth > 6 && currentMonth < 9) || (currentMonth === 8 && currentDay <= 31)) {
        return `${date.getFullYear()}-2`;
    } else if ((currentMonth === 9 && currentDay >= 1) || (currentMonth > 9 && currentMonth < 12) || (currentMonth === 12 && currentDay <= 25)) {
        return `${date.getFullYear()}-3`;
    } else {
        return `${date.getFullYear()}-4`;
    }
}

const year_semester = _year_semester();

console.log(year_semester);