// Postcode groups and colours from the "postcode-zones" summary workbook.
// Keep this file data-only so CRM display logic can change independently.
(function () {
  'use strict';
  const palette = {
    blue: '#D9EAF7', peach: '#FCE4D6', green: '#E2F0D9', yellow: '#FFF2CC',
    purple: '#E4DFEC', sky: '#DDEBF7', red: '#F4CCCC', mint: '#D9EAD3',
    orange: '#FCE5CD', slate: '#D0E0E3', pink: '#EAD1DC', ice: '#CFE2F3'
  };
  const groups = [
    ['G01', palette.blue, ['10100','10110','10120','10310']],
    ['G02', palette.peach, ['10130','10140','10150','10600']],
    ['G03', palette.green, ['10160','10170']],
    ['G04', palette.yellow, ['10200','10300','10320','10321','10330','10400','10500']],
    ['G05', palette.purple, ['10210','10220','10222','10900']],
    ['G06', palette.sky, ['10230','10240']],
    ['G07', palette.red, ['10250','10254','10260']],
    ['G08', palette.mint, ['10270','10271','10290']],
    ['G09', palette.orange, ['10280']],
    ['G10', palette.slate, ['10510']],
    ['G11', palette.pink, ['10520','10521']],
    ['G12', palette.ice, ['10530']],
    ['G13', palette.blue, ['10540']],
    ['G14', palette.peach, ['10550','10560','10570']],
    ['G15', palette.green, ['10700','10800','11130']],
    ['G16', palette.yellow, ['11000','11120']],
    ['G17', palette.purple, ['11110','11140']],
    ['G18', palette.sky, ['11150']],
    ['G19', palette.red, ['12000']],
    ['G20', palette.mint, ['12110','12150']],
    ['G21', palette.orange, ['12120']],
    ['G22', palette.slate, ['12130']],
    ['G23', palette.pink, ['12170']],
    ['G24', palette.ice, ['74000']],
    ['G25', palette.blue, ['75000']],
    ['G26', palette.peach, ['80000']],
    ['G27', palette.green, ['92110']],
    ['CHECK', '#FFF1D6', ['1026','105410','90326']]
  ].map(function (entry) { return { id: entry[0], color: entry[1], postcodes: entry[2] }; });
  const lookup = {};
  groups.forEach(function (group) {
    group.postcodes.forEach(function (postcode) { lookup[postcode] = group; });
  });
  window.PCT_POSTCODE_ZONES = Object.freeze(groups);
  window.pctFindPostcodeZone = function (postcode) {
    return lookup[String(postcode == null ? '' : postcode).replace(/\D/g, '')] || null;
  };
})();
