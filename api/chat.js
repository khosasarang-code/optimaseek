} else if(data.type === "word") {
      const link = document.createElement('a');
      link.href = 'data:text/plain;base64,' + data.data;
      link.download = data.filename || 'document.txt';
      link.click();
      thinking.querySelector(".bubble").innerHTML = `✅ <strong>Word document downloaded!</strong><br><small style="color:#6b7280">"${data.filename}" saved to your downloads. Open with WordPad or Word.</small>`;
    } else if(data.type === "pdf") {
      const link = document.createElement('a');
      link.href = 'data:text/html;base64,' + data.data;
      link.download = data.filename || 'document.html';
      link.click();
      thinking.querySelector(".bubble").innerHTML = `✅ <strong>PDF document downloaded!</strong><br><small style="color:#6b7280">"${data.filename}" saved. Open in browser → Press Ctrl+P → Save as PDF ✅</small>`;
    } else {
      thinking.querySelector(".bubble").innerHTML = marked.parse(data.reply || "Sorry, no response.");
    }
