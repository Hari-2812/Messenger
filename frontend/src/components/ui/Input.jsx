const Input = ({ label, className = '', id, ...props }) => (
  <div className="form-group">
    {label && (
      <label htmlFor={id} className="label">
        {label}
      </label>
    )}
    <input id={id} className={`input-field ${className}`.trim()} {...props} />
  </div>
);

export default Input;
