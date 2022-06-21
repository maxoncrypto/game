const calcInvestment = $('*[data-field="calc-investment"]');
const calcEarnings = $('*[data-field="calc-earnings"]');

calcInvestment.on("input", () => {
    console.log('calcInvestment changed');
    const investment = parseFloat(calcInvestment.val());
    const earnings = CalculateEarnings(investment);
    calcEarnings.text(`${earnings.toFixed(4)} BNB`);
})

function CalculateEarnings(_investment) {
    let honeypot = 0; // Honeypot
    let investment = _investment; // Investments
    let withdrawn = 0; // Pure income
    let compoundBonus = 0.02; // Default compound bonus

    // Reinvest every 12h
    for (let halfDay = 0; halfDay <= 60; halfDay++) {
        // Add 6% of your investment to your honeypot
        honeypot += investment * 0.06;

        // We can reinvest if there are more than 2 days
        // before the withdrawal
        const canReinvest =
            !(halfDay + 1) % 20 === 0 &&
            !(halfDay + 2) % 20 === 0 &&
            !(halfDay + 3) % 20 === 0 &&
            !(halfDay + 4) % 20 === 0;

        // Withdraw every 10th day (20 * 12h = 10 days)
        if (halfDay % 20 === 0 && halfDay > 0) {
            withdrawn += honeypot;

            //console.log('Withdrawn:', honeypot);
            // Reset honeypot
            honeypot = 0;

            // Reset compound bonus
            compoundBonus = 0.02;
            console.log(`Day: ${Math.floor(halfDay / 2)}, Total investments: ${investment} BNB, Total withdrawn: ${withdrawn}`);
        }
        // Reinvest every 12h, excluding 2 days before withdrawal
        else if (canReinvest && halfDay > 0) {
            // Increase compound bonus
            if (compoundBonus < 0.2) // Max compound bonus is 20%
                compoundBonus += 0.02; // +2% on each reinvestment

            // Add your earnings + bonus to your investment
            investment += honeypot + (honeypot * compoundBonus);
            //console.log('Reinvested!', honeypot + honeypot * compoundBonus);
            // Reset honeypot
            honeypot = 0;
        }
    }


    if (!withdrawn)
        return 0;

    return withdrawn;
}