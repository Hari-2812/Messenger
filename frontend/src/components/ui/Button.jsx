const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  whatsapp: 'btn-whatsapp',
};

const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseClass = variants[variant] || variants.primary;

  return (
    <button className={`${baseClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
};

export default Button;
