const Loader = ({ size = 'md', className = '' }) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size] || 'w-6 h-6';

  return <div className={`spinner ${sizeClass} ${className}`.trim()} />;
};

export default Loader;
