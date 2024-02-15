import { useState } from 'react';

import './SlidingObject.css';


const SlidingObject = () => {
  const [show, setShow] = useState(false);

  return (
    <div className='container'>
      <div className='sliders'>
        <div className='slide'>
          <p>stuff</p>
        </div>
        <div className='slide'>
          <p>stuff</p>
        </div>
        <div className='slide'>
          <p>stuff</p>
        </div>
        <div className='slide'>
          <p>stuff</p>
        </div>
        <div className='slide'>
          <p>stuff</p>
        </div>
        <div className='slide'>
          <p>stuff</p>
        </div>
        <div className='slide'>
          <p>stuff</p>
        </div>
      </div>

    </div>
  );
}

export default SlidingObject;
