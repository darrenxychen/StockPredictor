import { useState } from 'react';

import './SlidingObject.css';


const SlidingObject = () => {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(!show)}>Toggle</button>
      {show && <div>Slide in</div>}
    </div>
  );
}

export default SlidingObject;
