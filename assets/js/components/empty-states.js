 
     








     





    function emptyStateHtml({title, description, primaryHtml, secondaryHtml}) {
      return `<div class="empty-state"><h2 class="empty-state-title">${escapeHtml(title)}</h2>`
        +(description?`<p class="empty-state-sub">${escapeHtml(description)}</p>`:'')
        +((primaryHtml||secondaryHtml)?`<div class="empty-state-actions">${primaryHtml||''}${secondaryHtml||''}</div>`:'')
        +`</div>`;
    }
//# sourceMappingURL=empty-states.js.map
