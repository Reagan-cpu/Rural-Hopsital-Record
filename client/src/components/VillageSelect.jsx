import PropTypes from 'prop-types';
import villages from '../data/villages.json';
import styles from './VillageSelect.module.css';

/**
 * Simple village selector using HTML5 datalist.
 * User can type to filter villages by name or select from dropdown.
 */
export default function VillageSelect({
  value,
  nameValue,
  onChange,
  required = false,
  disabled = false,
}) {
  const selectedVillage = villages.find((v) => v.id === value);
  const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const handleInputChange = (e) => {
    const text = e.target.value;

    // Find village by exact name match
    const village = villages.find((v) => v.name === text);
    if (village) {
      onChange({ id: isUuid(village.id) ? village.id : '', name: village.name });
    } else {
      onChange({ id: '', name: text });
    }
  };

  return (
    <div className={styles.container}>
      <input
        list="village-list"
        type="text"
        value={selectedVillage?.name || nameValue || ''}
        onChange={handleInputChange}
        placeholder="Type or select village…"
        required={required && !value}
        disabled={disabled}
        autoComplete="off"
        className={styles.input}
      />
      <datalist id="village-list">
        {villages.map((v) => (
          <option key={v.id} value={v.name}>
            {v.district} — {v.state}
          </option>
        ))}
      </datalist>
    </div>
  );
}

VillageSelect.propTypes = {
  value: PropTypes.string,
  nameValue: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
};
