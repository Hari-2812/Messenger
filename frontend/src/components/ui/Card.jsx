const Card = ({ children, className = '', padded = true, ...props }) => (
  <section className={`card ${padded ? '' : 'p-0'} ${className}`.trim()} {...props}>
    {children}
  </section>
);

export default Card;
