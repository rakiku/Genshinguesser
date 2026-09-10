(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./data.js'));
    return;
  }
  root.GenshinGameLogic = factory(null);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (nodeData) {
  const source = nodeData || {};
  const characters = source.CHARACTERS || (typeof CHARACTERS !== 'undefined' ? CHARACTERS : []);
  const weapons = source.WEAPONS || (typeof WEAPONS !== 'undefined' ? WEAPONS : []);
  const hintFields = source.HINT_FIELDS || (typeof HINT_FIELDS !== 'undefined' ? HINT_FIELDS : []);
  const weaponHintFields = source.WEAPON_HINT_FIELDS || (typeof WEAPON_HINT_FIELDS !== 'undefined' ? WEAPON_HINT_FIELDS : []);

  function getPool(genre, rarityFilter) {
    const normalizedRarityFilter = ['4', '5', '45'].includes(rarityFilter) ? rarityFilter : 'all';
    const applyRarityFilter = item => {
      if (normalizedRarityFilter === '5') return item.rarity === 5;
      if (normalizedRarityFilter === '4') return item.rarity === 4;
      if (normalizedRarityFilter === '45') return item.rarity >= 4;
      return true;
    };

    if (genre === 'weapon') {
      return weapons.filter(applyRarityFilter);
    }
    return characters.filter(character => character.enabled !== false && applyRarityFilter(character));
  }

  function getHintFields(genre) {
    return genre === 'weapon' ? weaponHintFields : hintFields;
  }

  function findItemById(genre, id, rarityFilter) {
    return getPool(genre, rarityFilter || 'all').find(item => item.id === id) || null;
  }

  function compareItem(guess, answer, fields) {
    const result = {};
    fields.forEach(field => {
      result[field.key] = compareField(field, guess, answer);
    });
    return result;
  }

  function compareField(field, guess, answer) {
    const guessValue = guess[field.key];
    const answerValue = answer[field.key];

    switch (field.type) {
      case 'numeric': {
        if (
          guessValue === null || guessValue === undefined || guessValue === '' ||
          answerValue === null || answerValue === undefined || answerValue === ''
        ) {
          return { result: 'gray' };
        }

        const guessNumber = Number(guessValue);
        const answerNumber = Number(answerValue);
        if (!Number.isFinite(guessNumber) || !Number.isFinite(answerNumber)) {
          return { result: 'gray' };
        }
        if (guessNumber === answerNumber) return { result: 'green' };
        return { result: 'gray', arrow: guessNumber > answerNumber ? 'down' : 'up' };
      }
      case 'group': {
        if (!guessValue || !answerValue) return { result: 'gray' };
        if (guessValue === answerValue) return { result: 'green' };
        const guessGroup = guess[field.group];
        const answerGroup = answer[field.group];
        if (guessGroup && answerGroup && guessGroup === answerGroup) {
          return { result: 'yellow' };
        }
        return { result: 'gray' };
      }
      case 'exact':
      default:
        return String(guessValue) === String(answerValue) ? { result: 'green' } : { result: 'gray' };
    }
  }

  return {
    getPool,
    getHintFields,
    findItemById,
    compareItem,
    compareField,
  };
});
