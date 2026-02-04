'use client';

interface AddToCalendarBlockProps {
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
}

/**
 * AddToCalendarBlock - Calendar integration with Google & Apple options
 *
 * Provides buttons to:
 * - Open Google Calendar event creation
 * - Download Apple .ics file
 *
 * @component
 */
export function AddToCalendarBlock({
  title,
  date,
  time,
  location,
  description = '',
}: AddToCalendarBlockProps) {
  const handleGoogleCalendar = () => {
    // Parse date and time into proper format
    const datePart = date.includes('T') ? date.split('T')[0] : date;
    const timePart = time ? time : '00:00';

    // Format: YYYYMMDDTHHMMSS
    const startDateTime = `${datePart.replace(/-/g, '')}T${timePart.replace(/:/g, '')}00`;
    // Add 5 hours for event duration
    const startDate = new Date(`${datePart}T${timePart}:00`);
    startDate.setHours(startDate.getHours() + 5);
    const endDateTime = `${startDate.toISOString().split('T')[0].replace(/-/g, '')}T${startDate.getHours().toString().padStart(2, '0')}${startDate.getMinutes().toString().padStart(2, '0')}00`;

    const params = new URLSearchParams({
      text: title,
      dates: `${startDateTime}/${endDateTime}`,
      details: description,
      location: location,
    });

    window.open(
      `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`,
      '_blank'
    );
  };

  const handleAppleCalendar = () => {
    // Parse date and time
    const datePart = date.includes('T') ? date.split('T')[0] : date;
    const timePart = time ? time : '00:00';

    // Format for .ics: YYYYMMDDTHHMMSS
    const startDate = new Date(`${datePart}T${timePart}:00`);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 5);

    const formatIcsDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Wedding//EN
BEGIN:VEVENT
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:${title}
LOCATION:${location}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

    // Create blob and download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'wedding-event.ics');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-4 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
          {/* Google Calendar Button */}
          <button
            onClick={handleGoogleCalendar}
            className="px-3 py-1 text-sm rounded font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-primary)',
              color: '#FFFFFF',
            }}
            title="Add to Google Calendar"
          >
            + Google
          </button>

          {/* Apple Calendar Button */}
          <button
            onClick={handleAppleCalendar}
            className="px-3 py-1 text-sm rounded font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-secondary)',
              color: '#FFFFFF',
            }}
            title="Add to Apple Calendar"
          >
            + Apple
          </button>
        </div>
      </div>
    </div>
  );
}
