
import React from "react";
import Thumbnail from "./Thumbnail";

 const PostList = ({ posts }) => {
   if (!posts.length) return <p>No posts to display.</p>;
   return (
     <ul className="posts">
       {posts.map((p) => (
         <li key={p.url} className="post">

           {p.thumbnail && (
             <Thumbnail src={p.thumbnail} alt={p.title} size={120} />
           )}
           <a href={p.url} target="_blank" rel="noopener noreferrer">
             {p.title}
           </a>
         </li>
       ))}
     </ul>
   );
 };

 export default PostList;
