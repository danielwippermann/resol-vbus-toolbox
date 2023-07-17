function expectOwnPropertyNamesToEqual(actualObj, expected) {
    const actual = Object.getOwnPropertyNames(actualObj);
    expect(actual.sort()).toEqual(expected.slice(0).sort());
}


module.exports = {
    expectOwnPropertyNamesToEqual,
};
